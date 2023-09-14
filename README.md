# JestPaGenerator
Hello, 👋  
**JestPaGenerator** is a command-line tool that generates Jest page object files based on data from a JSON Postman collection file.   
This tool creates separate .js or .ts files for each folder in your collection, with each folder becoming a single .js or .ts script, and each endpoint within the folders becomes an export function that can be used in your test files.

## Support Javascript & TypeScript
- Javascript

![JestPaGenerator Javascript](https://i.ibb.co/0yWCRV1/js.png)

- TypeScript

![JestPaGenerator Javascript](https://i.ibb.co/CPB5HtS/ts.png)

## Installation

To use JestPaGenerator, you can install it globally using npm:

```bash
npm install -g jestpagenerator
```

## Usage
To generate Jest page files, run the following command:
```bash
jestconvert path/to/file.json
```
that will generate .js files inside **pages** folder, you may need to create it first.

## Notes
- This is just a basic converter, and you may need to adjust the code if your endpoints are complex, but at least now we don't have to create the script from scratch ;) 
- Remember to create a folder called *files* in your project's root directory and put all the files inside it if your endpoints contain files, because all files will be hardcode to *./files/yourfilename.extension*
- If you need sample JEST boilerplate go [here](https://github.com/hilalmustofa/jest-reqres-boilerplate-js) for Javascript, or [here](https://github.com/hilalmustofa/jest-reqres-boilerplate-ts) for TypeScript
## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Happy Testing 👋