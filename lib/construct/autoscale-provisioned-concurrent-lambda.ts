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

import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { IAlias, IVersion } from 'aws-cdk-lib/aws-lambda'
import { PredefinedMetric, ScalableTarget, ServiceNamespace } from 'aws-cdk-lib/aws-applicationautoscaling'

/**
 * Possible metrics that can be tracked by Application Auto Scaler for Lambda
 */
export enum MetricType {
    /**
     * Predefined metric calculating avarage value of Lambda provisioned concurrency utilization
     */
        // eslint-disable-next-line no-unused-vars
    Standard,
    /**
     * Custom metric calculating maximum value of Lambda provisioned concurrency utilization
     */
        // eslint-disable-next-line no-unused-vars
    Maximum
}

export interface AutoscaleProvisionedConcurrentLambdaProps {
    /**
     * Lambda function to be autoscaled
     */
    handler: IVersion,
    /**
     * Initial capacity of Lambda provisioned concurrency.
     * Default is 1.
     */
    initialCapacity?: number,
    /**
     * The minimum value that Application Auto Scaling can use to scale a target during a scaling activity.
     * Default is 1.
     */
    minCapacity?: number,
    /**
     * The maximum value that Application Auto Scaling can use to scale a target during a scaling activity.
     * Default is 50.
     */
    maxCapacity?: number,
    /**
     * Flag if custom metric should be used instead of standard one.
     * If false scaling will be based on average provisioned concurrency utilization
     * If true scaling will be based on maximum provisioned concurrency utilization
     * False is default
     */
    metricType?: MetricType,
    /**
     * Alarm to scale up triggers when the utilization of provisioned concurrency consistently exceeds targetValue.
     * Alarm to scale down triggers when utilization is consistently less than 90 percent of the targetValue.
     * TargetValue must be a number between 0 and 1. 0.8 is the default.
     */
    targetValue?: number,
}

/**
 * Creates new alias for given lambda to be scaled according to given parameters
 */
export class AutoscaleProvisionedConcurrentLambda extends Construct {
  readonly handler: IAlias

  constructor (scope: Construct, id: string, props: AutoscaleProvisionedConcurrentLambdaProps) {
    super(scope, id)

    // put defaults if no values provided
    const handler = props.handler
    const minCapacity = props.minCapacity ?? 1
    const maxCapacity = props.maxCapacity ?? 50
    const initialCapacity = Math.max(props.initialCapacity ?? 1, minCapacity)
    const metricType = props.metricType || MetricType.Standard
    const targetValue = props.targetValue || 0.8

    // alias for function to set provisioned concurrency
    const alias = new lambda.Alias(this, 'Alias', {
      aliasName: 'PCAutoscaled',
      version: handler,
      provisionedConcurrentExecutions: initialCapacity
    })

    // Application Auto Scaler
    const autoscaler = new ScalableTarget(this, 'AutoScaler', {
      serviceNamespace: ServiceNamespace.LAMBDA,
      minCapacity,
      maxCapacity,
      resourceId: `function:${handler.lambda.functionName}:${alias.aliasName}`,
      scalableDimension: 'lambda:function:ProvisionedConcurrency'
    })
    autoscaler.node.addDependency(alias)

    // set scaling characteristics according to given flag
    switch (metricType) {
      case MetricType.Standard:
        autoscaler.scaleToTrackMetric('PCUtilization', {
          targetValue,
          predefinedMetric: PredefinedMetric.LAMBDA_PROVISIONED_CONCURRENCY_UTILIZATION
        })
        break
      case MetricType.Maximum:
        autoscaler.scaleToTrackMetric('PCUtilization', {
          targetValue,
          customMetric: alias.metric('ProvisionedConcurrencyUtilization', {
            statistic: 'max'
          })
        })
        break
    }

    this.handler = alias
  }
}
