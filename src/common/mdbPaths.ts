import path = require("path");


export const normalizePath = (filePath: string) => path.resolve(filePath).toLowerCase();