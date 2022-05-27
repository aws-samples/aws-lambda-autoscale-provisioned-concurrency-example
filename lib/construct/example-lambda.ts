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
import * as iam from 'aws-cdk-lib/aws-iam'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { NagSuppressions } from 'cdk-nag'

export interface ExampleLambdaProps {
    /**
     * Working time of Lambda Function in miliseconds
     */
    workingTimeInMS?: number,
    /**
     * Initialization time of Lambda Function
     */
    coldStartTimeInMS?: number,
}

/**
 * Example lambda function which simulates working time and cold start time according to set parameters
 */
export class ExampleLambda extends Construct {
  readonly handler: lambda.IVersion

  constructor (scope: Construct, id: string, props: ExampleLambdaProps) {
    super(scope, id)

    const workingTimeInMS = props.workingTimeInMS || 10
    const coldStartTimeInMS = props.coldStartTimeInMS || 500

    // custom role for lambda execution
    const customRole = new iam.Role(this, 'CustomRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const handler = new NodejsFunction(this, 'Fun', {
      entry: 'src/test-function.ts',
      memorySize: 256,
      environment: {
        WORKING_TIME_MILLIS: workingTimeInMS.toString(),
        COLD_START_TIME_MILLIS: coldStartTimeInMS.toString()
      },
      tracing: lambda.Tracing.ACTIVE,
      role: customRole
    })

    const version = new lambda.Version(this, 'Version', {
      lambda: handler
    })

    // add statement allowing to execute this function and write logs to CloudWatch
    customRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))

    // suppress NAG rule
    ExampleLambda.addCdkNagSuppressions(customRole)

    this.handler = version
  }

  private static addCdkNagSuppressions (customRole: iam.Role) {
    NagSuppressions.addResourceSuppressions(customRole, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWSLambdaBasicExecutionRole is already at minimal scope'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'cannot scope down xray resources, must be *',
        appliesTo: ['Resource::*']
      }
    ], true)
  }
}
