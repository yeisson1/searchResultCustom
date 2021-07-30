// eslint-disable-next-line no-restricted-imports
import { zip } from 'ramda'
import { useCallback } from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'

import { useFilterNavigator } from '../FilterNavigatorContext'
import { newFacetPathName } from '../utils/slug'
import { HEADER_SCROLL_OFFSET } from '../../constants/SearchHelpers'
import {
  MAP_CATEGORY_CHAR,
  MAP_QUERY_KEY,
  MAP_VALUES_SEP,
  PATH_SEPARATOR,
  FULLTEXT_QUERY_KEY,
  PRODUCT_CLUSTER_IDS,
  SELLER_QUERY_KEY,
} from '../../constants/constants'
import useSearchState from '../../hooks/useSearchState'
import { getMainSearches } from '../utils/compatibilityLayer'

const scrollOptions = {
  baseElementId: 'search-result-anchor',
  top: -HEADER_SCROLL_OFFSET,
}

const removeElementAtIndex = (strArray:any, index:number) =>
  strArray.filter((_:any, i:number) => i !== index)

const upsert = (array:any[], item:any) => {
  const foundItemIndex = array.findIndex(
    (e) => e.value === item.value && e.map === item.map
  )

  if (foundItemIndex === -1) {
    array.push(item)
  } else {
    array[foundItemIndex] = item
  }
}

export const compareFacetWithQueryValues = (
  querySegment:any,
  mapSegment:any,
  facet:any
) => {
  return (
    decodeURIComponent(querySegment).toLowerCase() ===
      decodeURIComponent(facet.value).toLowerCase() && mapSegment === facet.map
  )
}

const replaceQueryForNewQueryFormat = (
  queryString:any,
  mapString:any,
  selectedFacets:any
) => {
  const queryArray = queryString.split(PATH_SEPARATOR)
  const mapArray = mapString.split(MAP_VALUES_SEP)
  const newQueryFormatArray = zip(queryArray, mapArray).map(
    ([querySegment, mapSegment]) => {
      const facetForQuery = selectedFacets.find((facet:any) => {
        return compareFacetWithQueryValues(querySegment, mapSegment, facet)
      })

      if (!facetForQuery) {
        return querySegment
      }

      return newFacetPathName(facetForQuery)
    }
  )

  return newQueryFormatArray.join(PATH_SEPARATOR)
}

const removeMapForNewURLFormat = (map:any, selectedFacets:any) => {
  const mapArray = map.split(MAP_VALUES_SEP)
  const mapsToFilter = selectedFacets.reduce((acc:any, facet:any) => {
    return facet.map === MAP_CATEGORY_CHAR ||
      (facet.newQuerySegment &&
        facet.newQuerySegment.toLowerCase() !== facet.value.toLowerCase())
      ? acc.concat(facet.map)
      : acc
  }, [])

  return mapArray
    .filter((mapItem:any) => !mapsToFilter.includes(mapItem))
    .join(MAP_VALUES_SEP)
}

const getCleanUrlParams = (currentMap:any) => {
  const urlParams = new URLSearchParams(window.location.search)

  urlParams.set(MAP_QUERY_KEY, currentMap)
  if (!currentMap) {
    urlParams.delete(MAP_QUERY_KEY)
  }

  urlParams.delete('page')

  return urlParams
}

const buildQueryAndMap = (
  querySegments:any,
  mapSegments:any,
  facets:any,
  selectedFacets:any
) => {
  const queryAndMap = facets.reduce(
    // The spread on facet is important so we can assign facet.newQuerySegment
    ({ query, map }:any, { ...facet }) => {
      const facetValue = facet.value

      facet.newQuerySegment = newFacetPathName(facet)
      if (facet.selected) {
        const facetIndex = zip(query, map).findIndex(([value, valueMap]) =>
          compareFacetWithQueryValues(value, valueMap, facet)
        )

        selectedFacets = selectedFacets.filter(
          (selectedFacet:any) =>
            selectedFacet.value !== facet.value &&
            selectedFacet.map !== facet.map
        )

        return {
          query: removeElementAtIndex(query, facetIndex),
          map: removeElementAtIndex(map, facetIndex),
        }
      }

      upsert(selectedFacets, facet)

      if (facet.map === MAP_CATEGORY_CHAR) {
        const lastCategoryIndex = map.lastIndexOf(MAP_CATEGORY_CHAR)

        if (lastCategoryIndex >= 0 && lastCategoryIndex !== map.length - 1) {
          // Corner case: if we are adding a category but there are other filter other than category applied. Add the new category filter to the right of the other categories.
          return {
            query: [
              ...query.slice(0, lastCategoryIndex + 1),
              facetValue,
              ...query.slice(lastCategoryIndex + 1),
            ],
            map: [
              ...map.slice(0, lastCategoryIndex + 1),
              facet.map,
              ...map.slice(lastCategoryIndex + 1),
            ],
          }
        }
      }

      return {
        query: [...query, facetValue],
        map: [...map, facet.map],
      }
    },
    { query: querySegments, map: mapSegments }
  )

  const newQueryMap = {
    query: queryAndMap.query.join(PATH_SEPARATOR),
    map: queryAndMap.map.join(MAP_VALUES_SEP),
  }

  return newQueryMap
}

export const buildNewQueryMap = (
  fullTextSellerAndCollection:any,
  facets:any,
  selectedFacets:any
) => {
  const querySegments = selectedFacets.map((facet:any) => facet.value)
  const mapSegments = selectedFacets.map((facet:any) => facet.map)

  const {
    ft: fullText,
    productClusterIds: collection,
    seller,
  } = fullTextSellerAndCollection

  if (fullText) {
    querySegments.push(fullText)
    mapSegments.push(FULLTEXT_QUERY_KEY)
  }

  // In search-resolver@v1.x, the productClusterIds is sent as a hidden facet, but in 0.x it is not.
  // This way, we only need to push the collection when it is not in the mapSegments.
  if (collection && mapSegments.indexOf(PRODUCT_CLUSTER_IDS) === -1) {
    querySegments.push(collection)
    mapSegments.push(PRODUCT_CLUSTER_IDS)
  }

  if (seller && mapSegments.indexOf(SELLER_QUERY_KEY) === -1) {
    querySegments.push(seller)
    mapSegments.push(SELLER_QUERY_KEY)
  }

  return buildQueryAndMap(querySegments, mapSegments, facets, selectedFacets)
}

const useFacetNavigation = (selectedFacets:any, scrollToTop = 'none') => {
  const { navigate, setQuery, query: runtimeQuery } = useRuntime()
  const { map, query } = useFilterNavigator() as any
  const { fuzzy, operator, searchState } = useSearchState()
  const { searchQuery } = useSearchPage()
  const fullTextQuery = map.split(',').includes('ft')

  const mainSearches = getMainSearches(query, map)

  const navigateToFacet = useCallback(
    (maybeFacets, preventRouteChange = false) => {
      const facets = Array.isArray(maybeFacets) ? maybeFacets : [maybeFacets]
      const { query: currentQuery, map: currentMap } = buildNewQueryMap(
        mainSearches,
        facets,
        selectedFacets
      )

      if (scrollToTop !== 'none') {
        window.scroll({ top: 0, left: 0, behavior: scrollToTop as any })
      }

      if (preventRouteChange) {
        const state =
          typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('searchState') ?? searchState
            : searchState ?? undefined

        const queries = {
          map: `${currentMap}`,
          query: `/${currentQuery}`,
          page: undefined as any,
          fuzzy: fullTextQuery ? fuzzy || undefined : undefined,
          operator: fullTextQuery ? operator || undefined : undefined,
          searchState: state,
        }

        setQuery(queries)

        return
      }

      let newQuery = replaceQueryForNewQueryFormat(currentQuery, currentMap, [
        ...selectedFacets,
        ...facets,
      ])

      const urlParams = getCleanUrlParams(
        removeMapForNewURLFormat(currentMap, [...selectedFacets, ...facets])
      )

      if (
        searchQuery &&
        searchQuery.variables &&
        (!urlParams.get('initialQuery') || !urlParams.get('initialMap'))
      ) {
        const { map: mapVariable, query: queryVariable } = searchQuery.variables

        urlParams.set('initialQuery', queryVariable)
        urlParams.set('initialMap', mapVariable)
      }

      if (fuzzy && fullTextQuery) {
        urlParams.set('fuzzy', fuzzy as any)
      }

      if (operator && fullTextQuery) {
        urlParams.set('operator', operator as any)
      }

      if (searchState) {
        urlParams.set(
          'searchState',
          sessionStorage.getItem('searchState') ?? searchState as any
        )
      }

      if (!newQuery) {
        const { initialQuery, initialMap } = runtimeQuery

        if (!initialQuery || !initialMap) {
          return
        }

        newQuery = initialQuery
        urlParams.set('map', initialMap)
      }

      navigate({
        to: `${PATH_SEPARATOR}${newQuery}`,
        query: urlParams.toString(),
        scrollOptions,
        modifiersOptions: {
          LOWERCASE: false,
        },
      })
    },[]
  ) 

  return navigateToFacet
}

export default useFacetNavigation
