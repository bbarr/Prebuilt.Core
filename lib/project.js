
const fs = require('fs')
const path = require('path')
const R = require('ramda')
const { promisify } = require('util')

const INPUT_DIR = 'input'
const OUTPUT_DIR = 'output'
const DATA_DIR = 'data'
const CONFIG_FILE = 'config.yaml'

const generateConfig = ({ name }) => {
  return `name: ${name}
`
}

const ensureFile = async (path, orContent='') => {
  try {
    await promisify(fs.stat)(path)
  } catch(e) {
    return promisify(fs.writeFile)(path, orContent)
  }
}

const ensureDir = async (path) => {
  try {
    await promisify(fs.stat)(path)
  } catch(e) {
    return promisify(fs.mkdir)(path)
  }
}

const ensureStructure = (projectPath, initialConfig) => {
  return Promise.all([
    ensureDir(`${projectPath}/${INPUT_DIR}`),
    ensureDir(`${projectPath}/${OUTPUT_DIR}`),
    ensureDir(`${projectPath}/${DATA_DIR}`),
    ensureFile(
      `${projectPath}/${CONFIG_FILE}`, 
      generateConfig(initialConfig)
    )
  ])
}

module.exports = {

  INPUT_DIR,
  OUTPUT_DIR,
  CONFIG_FILE,
  DATA_DIR,

  async init(projectPath, initialConfig) {
    await ensureStructure(projectPath, initialConfig)
  },

  onlyRenderable(filePaths) {
    return filePaths.filter(filePath => filePath.split(path.sep).pop().charAt(0) !== '_')
  }
}
