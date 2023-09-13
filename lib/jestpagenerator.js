const fs = require('fs');
const path = require('path');
function toPascalCase(str) {
    return str.replace(/[-_]/g, ' ').replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0) return "";
        return index === 0 ? match.toUpperCase() : match.toUpperCase();
    });
}

function generateRequestFunctions(requests) {
    const functions = [];

    requests.forEach(request => {
        const functionName = toPascalCase(request.name);
        const auth = request.request.auth;
        const method = request.request.method.toLowerCase();
        const path = request.request.url.path.join('/');
        const requestData = {};

        if (request.request.body) {
            if (request.request.body.mode === 'raw') {
                requestData.body = JSON.parse(request.request.body.raw || '{}');
            } else if (request.request.body.mode === 'formdata') {
                requestData.formData = request.request.body.formdata.map(item => {
                    if (item.type === 'file') {
                        const fileName = item.src.split('/').pop();
                        const relativeFilePath = `./files/${fileName}`;
                        return {
                            key: item.key,
                            value: relativeFilePath,
                            type: 'file',
                        };
                    } else {
                        const value = item.type === 'text' ? (isNaN(item.value) ? item.value : parseInt(item.value)) : item.value;
                        return {
                            key: item.key,
                            value: value,
                            type: 'text',
                        };
                    }
                });
            }
        }

        let script = `
export async function ${functionName}() {
    try {
        const res = await supertest(process.env.url)
            .${method}("/${path}")`;

        if (auth && auth.type === 'bearer') {
            script += `
            .set("Authorization", "Bearer " + access_token)`;
        }

        if (requestData.formData) {
            script += `
            .set("Content-Type", "multipart/form-data")`;
        } else {
            script += `
            .set("Content-Type", "application/json")`;
        }

        if (requestData.body) {
            script += `
            .send(${JSON.stringify(requestData.body, null, 2)})`;
        } else if (requestData.formData) {
            requestData.formData.forEach(formDataItem => {
                if (formDataItem.type === 'file') {
                    script += `
            .attach("${formDataItem.key}", "${formDataItem.value}")`;
                } else {
                    const fieldLine = typeof formDataItem.value === 'number'
                        ? `.field("${formDataItem.key}", ${formDataItem.value})`
                        : `.field("${formDataItem.key}", "${formDataItem.value}")`;
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
        console.error(error);
    }
}
`;

        functions.push(script);
    });

    return functions.join('\n');
}

const jsonDataPath = process.argv[2];

if (!jsonDataPath) {
  console.error('Please provide the correct path for the .json file.');
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
collectionData.item.forEach(category => {
    const categoryName = toPascalCase(category.name);
    const categoryRequests = category.item.filter(requestItem => requestItem.request);

    if (categoryRequests.length > 0) {
        const categoryScript = `import supertest from 'supertest';
${generateRequestFunctions(categoryRequests)}`;
        fs.writeFileSync(`./pages/${categoryName}.js`, categoryScript);
    }
});
