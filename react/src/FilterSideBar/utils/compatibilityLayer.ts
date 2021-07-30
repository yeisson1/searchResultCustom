import { groupBy, pathOr, zipObj } from 'ramda'
import { PATH_SEPARATOR, MAP_VALUES_SEP } from '../../constants/constants'

export const getMainSearches = (query:string, map:string) => {
  const querySegments = (query && query.split(PATH_SEPARATOR)) || []
  const mapSegments = (map && map.split(MAP_VALUES_SEP)) || []
  const zip = zipObj(mapSegments, querySegments)

  return {
    ft: zip.ft,
    productClusterIds: zip.productClusterIds,
    seller: zip.seller,
  }
}

export const buildSelectedFacetsAndFullText = (query:string, map:string, priceRange:any) => {
  if (!map || !query) {
    return []
  }

  const queryValues = query.split('/')
  const mapValues = decodeURIComponent(map).split(',')

  let fullText

  const selectedFacets =
    queryValues.length >= mapValues.length
      ? mapValues.map((map, i) => {
          if (map === 'ft') {
            fullText = decodeURI(queryValues[i])
          }

          return {
            key: mapValues[i],
            value: queryValues[i],
          }
        })
      : []

  if (priceRange) {
    selectedFacets.push({
      key: 'priceRange',
      value: priceRange,
    })
  }

  return [selectedFacets, fullText]
}

const addMap = (facet:any) => {
  facet.map = facet.key

  if (facet.children) {
    facet.children.forEach((facet:any) => addMap(facet))
  }
}

export const detachFiltersByType = (facets:any) => {
  facets.forEach((facet:any) => facet.facets.forEach((value:any) => addMap(value)))

  const byType = groupBy((filter:any) => filter.type) 

  const groupedFilters = byType(facets)

  const brands = pathOr([], ['BRAND', 0, 'facets'], groupedFilters)
  const brandsQuantity =
    groupedFilters &&
    groupedFilters.BRAND &&
    groupedFilters.BRAND[0] &&
    groupedFilters.BRAND[0].quantity != null
      ? groupedFilters.BRAND[0].quantity
      : 0

  const specificationFilters = (groupedFilters['NUMBER'] || []).concat(
    groupedFilters['TEXT'] || []
  )

  const categoriesTrees = pathOr(
    [],
    ['CATEGORYTREE', 0, 'facets'],
    groupedFilters
  )
  const priceRanges = pathOr(
    [],
    ['PRICERANGE', 0, 'facets'],
    groupedFilters
  ).map(priceRange => {
    return {
      ...priceRange,
      slug: `de-${priceRange.range.from}-a-${priceRange.range.to}`,
    }
  })

  return {
    brands,
    brandsQuantity,
    specificationFilters,
    categoriesTrees,
    priceRanges,
  }
}

export const buildQueryArgsFromSelectedFacets = (selectedFacets:any) => {
  return selectedFacets.reduce(
    (queryArgs:any, facet:any, index:number) => {
      queryArgs.query += `${index > 0 ? '/' : ''}${facet.value}`
      queryArgs.map += `${index > 0 ? ',' : ''}${facet.key}`
      return queryArgs
    },
    { query: '', map: '' }
  )
}
