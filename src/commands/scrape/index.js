#!/usr/bin/env node

import axios from 'axios'
import defaultRequestHeaders from "./requests/defaultRequestHeaders.js";
import directoryRequest from "./requests/directoryRequest.js";
import unitRequest from "./requests/unitRequest.js";
import path from 'path'
import { fileURLToPath } from 'url';
import {read, write} from '../../utils/io.js'
import createState from "../../utils/createState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sensitive = path.join(__dirname, '../../sensitive')

// Why yes, I AM a terrible person. Thank you for noticing!
const [f, setF] = createState()
const [getC, setC] = createState()
const B = Boolean
export default async function scrape(uf, hf) {
    setF(read(hf).filter(B))
    setC((() => ({
        ...(!f()[0].indexOf(':')>-1?{_: f().shift()}:{}),
        ...f().reduce((h, l)=>({...h, [l.split(':')[0].toLowerCase()]: l.split(':').slice(1).join(':')}),{})
    }['cookie']))())
    await Promise.all(read(uf).filter(Boolean).map(u => scrapeUnitInformation(parseInt(u))))
}

async function scrapeUnitInformation(unitNumber) {
    const unit = await scrapeMetadata(unitNumber)
    if (!unit) {
        return
    }

    const unitName = unit.name
        .split(' ')
        .filter(piece => !!piece)
        .map(s => s.toLowerCase())
        .join('-')

    write(`${sensitive}/out/unit-${unitNumber}-${unitName}.meta.json`, unit)

    const directory = await scrapeDirectory(unitNumber)
    if (directory) {
        write(`${sensitive}/out/unit-${unitNumber}-${unitName}.directory.json`, directory)
    }
}

const scrapeMetadata = async unitNumber => await makeRequest(
    unitNumber,
    `${unitRequest.url}${unitNumber}`,
    unitRequest
)

const scrapeDirectory = async unitNumber => await makeRequest(
    unitNumber,
    `${directoryRequest.url}?unit=${unitNumber}`,
    directoryRequest
)

async function makeRequest(unitNumber, url, req) {
    console.log(`${req.method} ${url}`)
    const response = await axios.request(url, {
        method: req.method,
        validateStatus: () => true,
        headers: {
            ...defaultRequestHeaders,
            ...req.headers,
            Cookie: getC()
        }
    })

    if (response.status === 200) {
        return response.data
    }

    console.error({
        message: `Error request info for unit ${unitNumber}`,
        unitNum: unitNumber,
        status: response.status,
        responseBody: response.data
    })
}
