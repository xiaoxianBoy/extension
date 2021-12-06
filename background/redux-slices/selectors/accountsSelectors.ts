import { createSelector } from "@reduxjs/toolkit"
import { selectHideDust } from "../ui"
import { RootState } from ".."
import { CompleteAssetAmount } from "../accounts"
import { selectAssetPricePoint } from "../assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "../utils/asset-utils"
import {
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
} from "../../assets"

// TODO What actual precision do we want here? Probably more than 2
// TODO decimals? Maybe it's configurable?
const desiredDecimals = 2
// TODO Make this a setting.
const mainCurrencySymbol = "USD"
// TODO Make this a setting.
const userValueDustThreshold = 2

const getAccountState = (state: RootState) => state.account
const getCurrentAccountState = (state: RootState) => {
  return state.account.accountsData[state.ui.selectedAccount.address]
}
const getAssetsState = (state: RootState) => state.assets

export const selectAccountAndTimestampedActivities = createSelector(
  getAccountState,
  getAssetsState,
  selectHideDust,
  (account, assets, hideDust) => {
    // Keep a tally of the total user value; undefined if no main currency data
    // is available.
    let totalMainCurrencyAmount: number | undefined

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssets = account.combinedData.assets
      .map<CompleteAssetAmount>((assetItem) => {
        const assetPricePoint = selectAssetPricePoint(
          assets,
          assetItem.asset.symbol,
          mainCurrencySymbol
        )

        if (assetPricePoint) {
          const enrichedAssetAmount = enrichAssetAmountWithDecimalValues(
            enrichAssetAmountWithMainCurrencyValues(
              assetItem,
              assetPricePoint,
              desiredDecimals
            ),
            desiredDecimals
          )

          if (typeof enrichedAssetAmount.mainCurrencyAmount !== "undefined") {
            totalMainCurrencyAmount ??= 0 // initialize if needed
            totalMainCurrencyAmount += enrichedAssetAmount.mainCurrencyAmount
          }

          return enrichedAssetAmount
        }

        return enrichAssetAmountWithDecimalValues(assetItem, desiredDecimals)
      })
      .filter((assetItem) => {
        const isNotDust =
          typeof assetItem.mainCurrencyAmount === "undefined"
            ? true
            : assetItem.mainCurrencyAmount > userValueDustThreshold
        const isPresent = assetItem.decimalAmount > 0

        // Hide dust and missing amounts.
        return hideDust ? isNotDust && isPresent : isPresent
      })

    return {
      combinedData: {
        assets: accountAssets,
        totalMainCurrencyValue: totalMainCurrencyAmount
          ? formatCurrencyAmount(
              mainCurrencySymbol,
              totalMainCurrencyAmount,
              desiredDecimals
            )
          : undefined,
      },
      accountData: account.accountsData,
    }
  }
)

export const selectCurrentAccountBalances = createSelector(
  getCurrentAccountState,
  getAssetsState,
  selectHideDust,
  (currentAccount, assets, hideDust) => {
    if (typeof currentAccount === "undefined" || currentAccount === "loading") {
      return undefined
    }

    // Keep a tally of the total user value; undefined if no main currency data
    // is available.
    let totalMainCurrencyAmount: number | undefined

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssetAmounts = Object.values(currentAccount.balances)
      .map<CompleteAssetAmount>(({ assetAmount }) => {
        const assetPricePoint = selectAssetPricePoint(
          assets,
          assetAmount.asset.symbol,
          mainCurrencySymbol
        )

        if (assetPricePoint) {
          const enrichedAssetAmount = enrichAssetAmountWithDecimalValues(
            enrichAssetAmountWithMainCurrencyValues(
              assetAmount,
              assetPricePoint,
              desiredDecimals
            ),
            desiredDecimals
          )

          if (typeof enrichedAssetAmount.mainCurrencyAmount !== "undefined") {
            totalMainCurrencyAmount ??= 0 // initialize if needed
            totalMainCurrencyAmount += enrichedAssetAmount.mainCurrencyAmount
          }

          return enrichedAssetAmount
        }

        return enrichAssetAmountWithDecimalValues(assetAmount, desiredDecimals)
      })
      .filter((assetAmount) => {
        const isNotDust =
          typeof assetAmount.mainCurrencyAmount === "undefined"
            ? true
            : assetAmount.mainCurrencyAmount > userValueDustThreshold
        const isPresent = assetAmount.decimalAmount > 0

        // Hide dust and missing amounts.
        return hideDust ? isNotDust && isPresent : isPresent
      })

    return {
      assetAmounts: accountAssetAmounts,
      totalMainCurrencyValue: totalMainCurrencyAmount
        ? formatCurrencyAmount(
            mainCurrencySymbol,
            totalMainCurrencyAmount,
            desiredDecimals
          )
        : undefined,
    }
  }
)

export type AccountTotal = {
  address: string
  shortenedAddress: string
  name?: string
  avatarURL?: string
  localizedTotalMainCurrencyAmount?: string
}

export const selectAccountTotals = createSelector(
  getAccountState,
  getAssetsState,
  (accounts, assets) => {
    return Object.entries(accounts.accountsData).map(
      ([address, accountData]) => {
        const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

        if (accountData === "loading") {
          return { address, shortenedAddress }
        }

        const totalMainCurrencyAmount = Object.values(accountData.balances)
          .map(({ assetAmount }) => {
            const assetPricePoint = selectAssetPricePoint(
              assets,
              assetAmount.asset.symbol,
              mainCurrencySymbol
            )

            if (typeof assetPricePoint === "undefined") {
              return 0
            }

            const convertedAmount = convertAssetAmountViaPricePoint(
              assetAmount,
              assetPricePoint
            )

            if (typeof convertedAmount === "undefined") {
              return 0
            }

            return assetAmountToDesiredDecimals(
              convertedAmount,
              desiredDecimals
            )
          })
          .reduce((total, assetBalance) => total + assetBalance, 0)

        return {
          address,
          shortenedAddress,
          name: accountData.ens.name,
          avatarURL: accountData.ens.avatarURL,
          localizedTotalMainCurrencyAmount: formatCurrencyAmount(
            mainCurrencySymbol,
            totalMainCurrencyAmount,
            desiredDecimals
          ),
        }
      }
    )
  }
)