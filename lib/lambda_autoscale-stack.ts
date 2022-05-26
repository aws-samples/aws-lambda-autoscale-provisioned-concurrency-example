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

import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { ApiGatewayWithLatencyLog } from './construct/api-gateway-with-latency-log'
import { AutoscaleProvisionedConcurrentLambda, MetricType } from './construct/autoscale-provisioned-concurrent-lambda'
import { QuickDashboard } from './construct/quick-dashboard'
import { ExampleLambda } from './construct/example-lambda'

export class LambdaAutoscaleStack extends Stack {
  constructor (scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // lambda function with standard applicaton auto scaler metric
    const standardLambda = new AutoscaleProvisionedConcurrentLambda(this, 'standard', {
      handler: new ExampleLambda(this, 'testFun1', {}).handler
    })

    // lambda function with custom applicaton auto scaler metric
    const customLambda = new AutoscaleProvisionedConcurrentLambda(this, 'custom', {
      handler: new ExampleLambda(this, 'testFun2', {}).handler,
      metricType: MetricType.Maximum
    })

    // api gateway with endpoint for each lambda function
    const apiGateway = new ApiGatewayWithLatencyLog(this, 'testApiGW', {
      endpoints: [
        { endpoint: 'standard', handler: standardLambda.handler },
        { endpoint: 'custom', handler: customLambda.handler }
      ]
    })

    // dashboard
    // eslint-disable-next-line no-new
    new QuickDashboard(this, 'sampleDashboard', {
      apiGateway: apiGateway.api,
      logGroup: apiGateway.log,
      lambdas: [
        { fun: standardLambda.handler, label: 'standardFun' },
        { fun: customLambda.handler, label: 'customFun' }
      ]
    })
  }
}
