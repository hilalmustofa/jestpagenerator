# JestPaGenerator
Hello, 👋  
**JestPaGenerator** is a command-line tool that generates Jest page object files based on data from a JSON Postman collection file.   
This tool creates separate .js files for each folder in your collection, with each folder becoming a single .js script, and each endpoint within the folders becomes an exported async function that can be used in your test files.

![JestPaGenerator Example](https://i.ibb.co/VLHNC1D/example.png)

## Installation

To use JestPaGenerator, you can install it either globally or locally in your project using npm:

```bash
npm install jestpagenerator
```

## Usage
To generate Jest page files, run the following command:
```bash
jestconvert path/to/file.json
```
that will generate .js files inside **pages** folder, you may need to create it first.

## Notes
This is the first release, and you may need to adjust the code if your endpoints are complex, but at least now we don't have to create the script from scratch ;) Enjoy!

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
