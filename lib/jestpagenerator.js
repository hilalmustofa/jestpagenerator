const fs = require('fs');
const path = require('path');

function toPascalCase(str) {
    return str.replace(/[-_]/g, ' ').replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0) return "";
        return index === 0 ? match.toUpperCase() : match.toUpperCase();
    }).replace(/[^\w\s]/g, '');
}

function generateRequestFunctions(requests, selectedLanguage, parentHeaders) {
    const functions = [];

    requests.forEach(request => {
        const functionName = toPascalCase(request.name);
        const auth = request.request.auth;
        const method = request.request.method.toLowerCase();
        const urlPath = request.request.url.path;
        const fullPath = urlPath ? `/${urlPath.join('/')}` : "";
        const requestData = {};
        const requestBody = request.request.body;
        const requestHeaders = { ...parentHeaders, ...request.request.header };

        if (requestBody) {
            if (requestBody.mode === 'raw') {
                let rawBody = requestBody.raw || '{}';
                rawBody = rawBody.replace(/{{|}}/g, '');
                rawBody = rawBody.replace(/"([^"]+)":\s*([^,}\n]+)/g, (match, key, value) => {
                    if (value.match(/^".*"$/)) {
                        return match;
                    } else {
                        return `"${key}": "${value}"`;
                    }
                });
                try {
                    requestData.body = JSON.parse(rawBody);
                } catch (error) {
                    requestData.body = rawBody;
                }
            } else if (requestBody.mode === 'formdata') {
                requestData.formData = requestBody.formdata.map(item => {
                    if (item.type === 'file') {
                        const fileName = item.src.split('/').pop();
                        const relativeFilePath = `./files/${fileName}`;
                        return {
                            key: item.key,
                            value: relativeFilePath,
                            type: 'file',
                        };
                    } else {
                        let value = item.type === 'text' ? (isNaN(item.value) ? item.value : parseInt(item.value)) : item.value;
                        return {
                            key: item.key,
                            value: value,
                            type: 'text',
                        };
                    }
                });
            }
        }

        let script;

        if (selectedLanguage === 'typescript') {
            script = `export async function ${functionName}() {
    try {
        const res = await supertest(process.env.baseurl)
            .${method}("${fullPath}")`;
        } else {
            script = `async function ${functionName}() {
    try {
        const res = await supertest(process.env.baseurl)
            .${method}("${fullPath}")`;
        }

        if (auth && auth.type === 'bearer') {
            script += `
            .set("Authorization", "Bearer " + access_token)`;
        }

        if (requestHeaders) {
            Object.keys(requestHeaders).forEach((key) => {
                const header = requestHeaders[key];
                const headerName = header.key;
                const headerValue = header.value;
                script += `
            .set("${headerName}", "${headerValue}")`;
            });
        }
        
        if (requestData.formData) {
            script += `
            .set("Content-Type", "multipart/form-data")`;
        } 

        if (requestData.body) {
            let requestBodyString = JSON.stringify(requestData.body, null, 2);
            if (requestBodyString.includes('\\')) {
                requestBodyString = requestBodyString
                    .replace(/\\n/g, '')
                    .replace(/\\/g, '')
                    .replace(/\s{3,}/g, '')
                    .replace(/"([^"]+)":\s*"([^"]+)"/g, "'$1': '$2'")
                    .replace(/"([^"]+)":/g, "'$1':");
                }
            script += `
            .send(${requestBodyString})`;
        }
         else if (requestData.formData) {
            requestData.formData.forEach(formDataItem => {
                if (formDataItem.type === 'file') {
                    script += `
            .attach("${formDataItem.key}", "${formDataItem.value}")`;
                } else {
                    const formattedValue = JSON.stringify(formDataItem.value).replace(/^"|"$/g, '');
                    const fieldLine = typeof formDataItem.value === 'number'
                        ? `.field("${formDataItem.key}", ${formattedValue})`
                        : `.field("${formDataItem.key}", "${formattedValue}")`;
                    script += `
            ${fieldLine}`;
                }
            });
        } else {
            script += `
            .send()`;
        }
        script += `;
        return res;
    } catch (error) {
        throw(error);
    }
}`;
        functions.push({ functionName, script });
    });

    return functions;
}

function generateFolderScript(language, functions) {
    if (language === 'typescript') {
        return `import supertest from 'supertest';

${functions.join('\n\n')}
`;
    } else {
        return `const supertest = require('supertest');

${functions.join('\n\n')}

module.exports = {
    ${functions.map(func => func.split('async function ')[1].split('(')[0].trim()).join(',\n    ')}
};`;
    }
}

function processCategory(category, basePath, parentPath = "", selectedLanguage) {
    const functions = [];

    category.forEach(item => {
        if (item.request) {
            const { script } = generateRequestFunctions([item], selectedLanguage)[0];
            functions.push(script);
        } else if (item.item) {
            const subfolderName = toPascalCase(item.name).toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_');
            const newBasePath = parentPath ? path.join(basePath, parentPath) : basePath;
            fs.mkdirSync(newBasePath, { recursive: true });
            processCategory(item.item, newBasePath, subfolderName, selectedLanguage);
        }
    });

    if (functions.length > 0) {
        const fileExtension = selectedLanguage === 'typescript' ? 'ts' : 'js';
        let fileName = parentPath
            ? `${parentPath}.${fileExtension}`
            : `index.${fileExtension}`;
            fileName = fileName.replace(/\s/g, '_');

        const folderScript = generateFolderScript(selectedLanguage, functions);
        fs.writeFileSync(path.join(basePath, fileName), folderScript);
    }
}

const jsonDataPath = process.argv[2];
const selectedLanguage = process.argv[3];


if (!jsonDataPath) {
    console.error('Please provide the correct path for the .json file.');
    process.exit(1);
}

if (!selectedLanguage || (selectedLanguage !== 'javascript' && selectedLanguage !== 'typescript')) {
    console.error('Please provide a valid language (javascript or typescript).');
    process.exit(1);
}

let absoluteJsonDataPath;

if (!path.isAbsolute(jsonDataPath)) {
    absoluteJsonDataPath = path.resolve(process.cwd(), jsonDataPath);
} else {
    absoluteJsonDataPath = path.resolve(jsonDataPath);
}

if (!fs.existsSync(absoluteJsonDataPath)) {
    console.error(`The file ${absoluteJsonDataPath} does not exist.`);
    process.exit(1);
}

const collectionData = require(absoluteJsonDataPath);
processCategory(collectionData.item, './pages', undefined, selectedLanguage);
