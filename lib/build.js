
const path = require('path')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)

const R = require('ramda')
const yaml = require('node-yaml')
const Liquid = require('liquid-node')
const liquid = new Liquid.Engine

const { filters } = require('./liquid_extensions')
liquid.registerFilters(filters)

const then = R.invoker(1, 'then')
const ensureIsArray = x => Array.isArray(x) ? x : [ x ]

const parseAndRenderLiquid = R.bind(liquid.parseAndRender, liquid)
const parseContent = R.pipe(parseAndRenderLiquid, then(R.trim))
const parseMeta = R.pipe(
  parseAndRenderLiquid,
  then(yaml.parse),
  then(ensureIsArray)
)

function extractMetaAndContent(raw) {
  let [ _, meta, content ] = raw.split(/^---/m)
  if (!content) content = _
  return [ meta, content ]
}

const build = module.exports = async (file, data, { readFile }, inheritedMeta={}) => {

  const [ rawMeta, ...rawContent ] = extractMetaAndContent(file.raw)

  const metas = await parseMeta(rawMeta, data)

  return Promise.all(
    metas.map(async (meta = {}, i) => {

      const extendedMeta = R.merge(meta, inheritedMeta)
      const extendedData = R.merge(data, { meta: R.merge(extendedMeta, { index: i }) })

      // don't use extendedMeta here, as we only wnat the locally-defined layout
      const layoutFile = meta.layout &&
        await readFile(path.join(file.path, meta.layout))

      const content = await parseContent(rawContent.join('---'), extendedData)

      return layoutFile ?
        (await build(layoutFile, R.merge(extendedData, { content }), { readFile }, extendedMeta))[0] :
        [ extendedMeta, content ]
    })
  )
}

