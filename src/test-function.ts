/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { APIGatewayProxyResult } from 'aws-lambda'

const workTime = parseInt(process.env.WORKING_TIME_MILLIS || '20')
const coldStartTime = parseInt(process.env.COLD_START_TIME_MILLIS || '200')
let coldStart = true

/**
 * Simulates the initialisation phase taking @coldStartTime ms
 */
async function init () {
  console.log(`Setting cold start time: ${coldStartTime}`)
  console.log('Init started')
  await new Promise(resolve => {
    setTimeout(resolve, coldStartTime)
  })
  console.log('Init ended')
  return false
}

/**
 * Simulates function that is working for @workTime ms and have a one time initialization taking @coldStartTime ms
 */
export const handler = async (): Promise<APIGatewayProxyResult> => {
  if (coldStart) { coldStart = await init() }

  console.log(`Setting working time: ${workTime}`)
  console.log('Execution started')
  await new Promise(resolve => {
    setTimeout(resolve, workTime)
  })
  console.log('Execution ended')
  return { body: 'OK', statusCode: 200 }
}
