import touch from "touch";
import jstring from "./jstring.js";
import fs from 'node:fs'
import path from 'node:path'

export function write(file, data, options) {
  const raw = !!options?.raw
  const absPath = path.resolve(file)
  if (!fs.existsSync(absPath)) {
    fs.mkdirSync(path.dirname(absPath), {recursive: true})
    touch.sync(absPath, {force: true})
  }

  fs.writeFileSync(absPath, raw ? data : jstring(data))
}

export function read(file) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Invalid path: ${filePath} does not exist`);
  }

  return fs.readFileSync(filePath)
  .toString()
  .split('\n')
}
