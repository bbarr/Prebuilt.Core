
const path = require('path')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)

const R = require('ramda')
const yaml = require('node-yaml')
const Liquid = require('liquid-node')
const liquid = new Liquid.Engine

liquid.registerFilters({
  json: function(input) {
    return JSON.stringify(input)
  }
})

// utilities - async
const then = R.invoker(1, 'then')
const ensureIsArray = x => Array.isArray(x) ? x : [ x ]

// utilities - file system
const readTextFile = path => readFile(path, 'utf-8')
const writeFileRecursive = async (_path, content) => {
  await exec(`mkdir -p ${path.dirname(_path)}`)
  return writeFile(_path, content)
}

// Drop used by liquid to lazily walk data/
class LazyData extends Liquid.Drop {

  constructor(cursor='') {
    super()
    this.cursor = cursor
  }

  async beforeMethod(method) {

    if (!this.cursor) {
      return new LazyData('data').get(method)
    }

    this.cursor = path.join(this.cursor, method)
    const dir = `${__dirname}/../demo/${this.cursor}`
    try {
      if ((await stat(dir)).isDirectory()) {
        return new LazyData(this.cursor)
      }
    } catch(e) {}

    try {
      if ((await stat(dir + '.json')).isFile()) {
        return JSON.parse(await readTextFile(dir + '.json', 'utf-8'))
      }
    } catch(e) {}

    return '[missing]'
  }
}

const parseAndRenderLiquid = R.bind(liquid.parseAndRender, liquid)
const parseYaml = R.bind(yaml.parse, yaml)
const includeIndex = arr => arr.map((item, index) => R.merge(item, { index }))
const splitTemplate = R.split(/^---/m)
const joinTemplate = R.join('---')

const parseMeta = R.pipe(
  parseAndRenderLiquid,
  then(yaml.parse),
  then(ensureIsArray),
  then(includeIndex)
)
const parseContent = R.pipe(parseAndRenderLiquid, then(R.trim))

const parseTemplate = async (inputDir, fileName, data, metaExtension) => {

  const rawTemplate = await readTextFile(`${inputDir}/${fileName}`)

  let [ _, rawMeta, ...rawContent ] = splitTemplate(rawTemplate)
  if (!rawMeta) rawContent = [ _ ]

  const metas = ensureIsArray(await parseMeta(rawMeta, data))
  
  return Promise.all(
    metas.map(async (meta) => {
      const extendedMeta = metaExtension ? R.merge(meta, metaExtension) : meta
      const page = [ extendedMeta, await parseContent(joinTemplate(rawContent), R.merge(data, { meta: extendedMeta })) ]
      return meta.layout ? wrapLayout(inputDir, page, data) : page
    })
  )
}

const wrapLayout = async (inputDir, [ meta, content ], data) => {
  const [ [ layoutMeta, layoutContent ] ] = await processTemplate(inputDir, meta.layout, R.merge(data, { content }), meta)
  return [ R.merge(layoutMeta, meta), layoutContent ]
}

const processTemplate = parseTemplate
const skipPrivateFiles = R.filter(file => file.charAt(0) !== '_')
const htmlAndOthers = R.partition(file => /\.html$/.test(file))

const api = module.exports = async ({ templates, data }) => {

  // gather files
  const files = skipPrivateFiles(await readdir(inputDir))

  const [ html, others ] = htmlAndOthers(files)

  const movingHtml = html.map(async (file) => {

    // process file
    const pages = await processTemplate(inputDir, file, { data: new LazyData })

    // write output!
    return Promise.all(
      pages.map(async ([ meta, content ]) => {
        const outputFile = R.pathOr(file, [ 'output' ], meta)
        await writeFileRecursive(`${outputDir}/${outputFile}`, content)
        return outputFile
      })
    )
  })

  const movingOthers = others.map(file => {
    return copyFile(`${inputDir}/${file}`, `${outputDir}/${file}`)
  })

  return Promise.all([ ...movingHtml, ...movingOthers ])
}

