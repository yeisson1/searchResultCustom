import { path } from 'ramda'

import { changeImageUrlSize, toHttps } from './urlHelpers'

function findAvailableProduct(item:any) {
  return item.sellers.find(
    ({ commertialOffer = {} }:any) => commertialOffer.AvailableQuantity > 0
  )
}

export function normalizeProduct(product:any) {
  if (!product) return null
  const normalizedProduct = { ...product }
  const items = normalizedProduct.items || []
  const sku = items.find(findAvailableProduct) || items[0]
  if (sku) {
    const [seller = { commertialOffer: { Price: 0, ListPrice: 0 } }] =
      path(['sellers'], sku) || []
    const [referenceId = { Value: '' }] = path(['referenceId'], sku) || []
    const [image = { imageUrl: '' }] = path(['images'], sku) || []
    const resizedImage = changeImageUrlSize(toHttps(image.imageUrl), 500)
    const normalizedImage = { ...image, imageUrl: resizedImage }
    normalizedProduct.sku = {
      ...sku,
      seller,
      referenceId,
      image: normalizedImage,
    }
  }
  return normalizedProduct
}
