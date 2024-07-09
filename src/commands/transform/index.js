import {read, write} from "../../utils/io.js";
import fs from "node:fs";
import path from "node:path";
import paths from "../../utils/paths.js";
import createState from "../../utils/createState.js";
import jparse from "../../utils/jparse.js";
import _ from "lodash";

const [getUnitDirectories, setUnitDirectories] = createState()
const [subscribers, setSubscribers] = createState()

const columnNames = [
  'Name',
  'Given Name',
  'Additional Name',
  'Family Name',
  'Yomi Name',
  'Given Name Yomi',
  'Additional Name Yomi',
  'Family Name Yomi',
  'Name Prefix',
  'Name Suffix',
  'Initials',
  'Nickname',
  'Short Name',
  'Maiden Name',
  'Birthday',
  'Gender',
  'Location',
  'Billing Information',
  'Directory Server',
  'Mileage',
  'Occupation',
  'Hobby',
  'Sensitivity',
  'Priority',
  'Subject',
  'Notes',
  'Language',
  'Photo',
  'Group Membership',
  'E-mail 1 - Type',
  'E-mail 1 - Value',
  'Phone 1 - Type',
  'Phone 1 - Value'
]


// function createParser(keysFile) {
//   const transformSettings = jparse(read(keysFile))
//   return createSubParser(transformSettings)
// }


// function createSubParser(rule) {
//   // base case - get the thing
//   if (typeof rule === "string") {
//     const subpath = `${rule}`
//     return (thing) => {
//       if (!Array.isArray(thing)) {
//         return [_.get(thing, subpath)]
//       }
//
//       return thing.reduce((rows, item) => [...rows, [_.get(item, subpath)]], [])
//     }
//   }
//
//   // rule is an object of additional rules
//   if (!('path' in rule)) {
//     throw new Error(`rule is missing required property 'path'\n${{rule}}`)
//   }
//
//   if (!('merge' in rule)) {
//     throw new Error(`rule is missing required property 'merge'\n${{rule}}`)
//   }
//
//   const merge = !!rule.merge
//   const subpath = `${rule.path}`
//   const subrules = Object.entries(rule).filter(([ruleName, _rule]) => !['merge', 'path'].includes(ruleName))
//
//   const subparsers = subrules.reduce(
//     (parsers, [_ruleName, rule]) => ([...parsers, createSubParser(rule)]),
//   [])
//
//   return (thing) => {
//     const subthing = !!subpath ? thing[subpath] : thing
//     const extractedColumns = subparsers.reduce((d, subparser) => ([...d, subparser(subthing)]), []).filter(row => row !== undefined)
//     const transposed = Array.isArray(extractedColumns[0]) ? extractedColumns[0].map((_, colIndex) => extractedColumns.map(row => row[colIndex])) : extractedColumns
//
//     let result = transposed
//     if (merge) {
//       result = transposed.reduce((merged, row) => ([...merged, ...row]), [])
//     }
//
//     return result
//   }
// }

export default function transform(unitsFile, _) {
  setSubscribers(buildSubscriberList())
  setUnitDirectories(listDirectoryFiles())
  read(unitsFile).filter(Boolean).map(parseInt).forEach(toCSV)
}

function buildSubscriberList() {
  const members = jparse(read(path.join(paths.sensitiveDir, 'config', 'subscribers.json')))['members']
  return members.reduce((subs, member) => {
    const name = _.get(member, 'name')
    if (!name) {
      return subs
    }

    return {
      ...subs,
      [name]: (
        !!_.get(member, 'emailAddress')
        && !!_.get(member, 'validAddress')
        && !_.get(member, 'unsubscribedFromEmail')
      )
    }
  }, {})
}

function toCSV(unitNumber) {
  const unitFile = getUnitFilePath(unitNumber)
  if (!unitFile) {
    console.warn('Could not find file for unit', {unitNumber})
    return
  }
  const wardDirectory = jparse(read(unitFile)).reduce((a, b) => a.concat(b), [])
  const rows = wardDirectory
    .reduce((contacts, household) => [...contacts, ...parseHousehold(household)], [])
    .map(contact => toRow(contact))

  rows.unshift(columnNames)
  const csvData = rows.map(row => row.join(',')).join('\n')

  const fileName = path.basename(unitFile).split('.')[0]
  const contactsCSVFile = path.join(path.dirname(unitFile), `${fileName}.csv`)
  write(contactsCSVFile, csvData, {raw: true})
}

function getUnitFilePath(unitNumber) {
  const file = getUnitDirectories().find(d => d.includes(unitNumber))
  if (!file) {
    return null
  }

  return path.join(paths.dataFolder, file)
}


function listDirectoryFiles() {
  return fs.readdirSync(paths.dataFolder).filter(filePath => filePath.endsWith('.directory.json'))
}

function toRow(entry) {
  return columnNames.map(col => _.get(entry, col, ''))
}


function parseHousehold(household) {
  return _
    .get(household, "members", [])
    .reduce((entries, member) => [...entries, parseMember(member, household)], [])
}

function parseMember(member, household) {
  return {
    ...getNames(member),
    ...getBirthday(member),
    ...getGender(member, household),
    ...getCallings(member),
    ...getNotes(member),
    ...getPhoto(member),
    ...getEmail(member),
    ...getPhone(member),
    ...getLocation(household),
  }
}

function getLocation(household) {
  return {
    'Location': _.get(household, "address", '').replaceAll('\n', ' ').replaceAll(',', ' '),
  }
}

function getNames(member) {
  const givenNames = _.get(member, "givenName", '').split(' ')
  return {
    'Name': _.get(member, "displayName", ''),
    'Given Name': givenNames[0],
    'Additional Name': givenNames.length > 1 ? givenNames.slice(1).join(' ') : '',
    'Family Name': _.get(member, "surname", ''),
    'Initials': getMemberInitials(member),
  }
}

function getEmail(member) {
  // Filters out folks who are unsubscribed
  if (!subscribers()[_.get(member, 'name')]) {
    return {}
  }

  return _.has(member, 'email') ? {
    'E-mail 1 - Type': 'Other',
    'E-mail 1 - Value': _.get(member, "email.email", '')
  } : {}
}

function getPhone(member) {
  // Filters out folks who are unsubscribed
  if (!subscribers()[_.get(member, 'name')]) {
    return {}
  }

  return _.has(member, 'phone') ? {
    'Phone 1 - Type': 'Other',
    'Phone 1 - Value': _.get(member, "phone.number", '')
  } : {}
}

function getMemberInitials(member) {
  return `${_.get(member, 'givenName')?.[0].toUpperCase()}${_.get(member, 'surname')?.[0].toUpperCase()}`
}

function getBirthday(member) {
  // I think I can only see birthdays and stuff in my household, but this could be useful for a
  // bishop using this tool I guess..
  return {
    'Birthday': _.get(member, 'birthDate', '').replaceAll('\n', ' ').replaceAll(',', ' ')
  }
}

function isMaleCalling(calling) {
  const name = _.get(calling, 'positionTypeName', '').toLowerCase()
  return (
    name.includes('elders')
    || name.includes('priests')
    || name.includes('teachers')
    || name.includes('deacons')
    || name.includes('quorum')
    || name.includes('stake high councilor')
    || name.includes('aaronic')
    || name.includes('melchizedek')
    || name.includes('bishop')
    || name.includes('clerk')
  )
}

function isFemaleCalling(calling) {
  const name = _.get(calling, 'positionTypeName', '').toLowerCase()
  return (
    name.includes('woman')
    || name.includes('women')
    || name.includes('relief society')
  )
}

function getGender(member, household) {
  const sex = _.get(member, 'sex')
  if (sex) {
    return {'Gender': sex.toLowerCase()}
  }

  const priesthood = _.get(member, 'priesthood')
  if (priesthood) {
    return {'Gender': 'male'}
  }

  const ordinances = _.get(member, 'ordinances', [])
  if (ordinances.length && ordinances.some(ord => ord.label.toLowerCase().includes('ordained'))) {
    return {'Gender': 'male'}
  }

  const callings = _.get(member, 'positions', [])
  if (callings.length) {
    if (callings.some(calling => isFemaleCalling(calling))) {
      return {'Gender': 'female'}
    } else if (callings.some(calling => isMaleCalling(calling))) {
      return {'Gender': 'male'}
    }
  }

  const headsOfHousehold = (() => {
    const raw = _.get(household, "name", '')
    if (!raw) {
      return []
    }

    return raw.split(', ')[1].split(' & ')
  })()

  if (headsOfHousehold.length === 2) { // The church almost always specifies male first in a married household.
    return {'Gender': _.get(member, 'givenName') === headsOfHousehold[0] ? 'male' : 'female'}
  }

  return {'Gender': ''}
}

function getCallings(member) {
  const pos = _.get(member, 'positions', [])
  return {
    'Occupation': pos.reduce((acc, cur) => [...acc, _.get(cur, 'positionTypeName', '')], []).filter(Boolean).join('; ')
  }
}

function getNotes(member) {
  const notes = []
  return {'Notes': notes.join('; ')}
}

function getPhoto(member) {
  return {'Photo': 'http://placebacon.net/100/100'} // TODO
}
