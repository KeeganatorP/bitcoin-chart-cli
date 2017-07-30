#!/usr/bin/env node

const {get, defaultTo, map,
    flow, remove, chunk, ceil,
    mean, negate, first, tail} = require('lodash/fp')
const axios = require('axios')
const moment = require('moment')
const asciichart = require ('asciichart')
const param = require('commander')
const wrap = require('word-wrap')

param
    .version('1.1.2')
    .option('-d, --days <n>', 'number of hours the chart will go back', parseInt)
    .option('-w, --width <n>', 'max terminal chart width', parseInt)
    .option('-h, --height <n>', 'max terminal chart height', parseInt)
    .option('-e, --ethereum', 'show ethereum chart instead of bitoin')
    .option('-z, --zcash', 'show zcash chart instead of bitoin')
    .option('-l, --litecoin', 'show litecoin chart instead of bitoin')
    .option('-r, --ripple', 'show ripple chart instead of bitoin')
    .option('--disable-legend', 'disable legend text')
    .parse(process.argv)

const days = defaultTo(72)(param.days)
const maxWidth = defaultTo(100)(param.width)
const maxHeight = defaultTo(14)(param.height)
const coins = [
    [param.ethereum, 'ETH', 'Ethereum'],
    [param.litecoin, 'LTC', 'Litecoin'],
    [param.ripple, 'XRP', 'Ripple'],
    [param.zcash, 'ZEC', 'Zcash'],
    [true, 'BTC', 'Bitcoin']
]

const [coin, coinname] = flow(remove(negate(first)), first, tail)(coins)
const today = moment().format('YYYY-MM-DD')
const past = moment().subtract(days, 'days').format('YYYY-MM-DD')
const ccApi = `https://min-api.cryptocompare.com/data/histohour?fsym=${coin}&tsym=USD&limit=${days}&e=CCCAGG`
const ccApiCurrent = `https://min-api.cryptocompare.com/data/price?fsym=${coin}&tsyms=USD,EUR,AUD,BTC,ETH`
const current = async url => (await axios.get(url)).data
const print = string => process.stdout.write(string + '\n')

const bitcoin = async url => {
    const res = await axios.get(url)
    return flow(
        get('data.Data'),
        map('close'),
        chunk(ceil(days/maxWidth)),
        map(mean)
    )(res)
}

const main = async () => {
    const fetchApi = [bitcoin(ccApi), current(ccApiCurrent)]
    const [history, {USD, EUR, AUD, BTC, ETH}] = await Promise.all(fetchApi)
    const legend = `\t${coinname}: past ${days} hours ${past} to ${today}.\n$${USD} / ${EUR}€ / AUD ${AUD} / BTC ${BTC} / ETH ${ETH}`
    print(asciichart.plot (history, { height: maxHeight }))
    return !param.disableLegend && print(wrap(legend, {width: maxWidth, newline: '\n\t'}))
}

main()
