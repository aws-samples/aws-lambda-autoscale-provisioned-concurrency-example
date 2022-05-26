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

import {Construct} from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {IVersion} from "aws-cdk-lib/aws-lambda";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";

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
    readonly handler: IVersion

    constructor(scope: Construct, id: string, props: ExampleLambdaProps) {
        super(scope, id);

        const workingTimeInMS = props.workingTimeInMS || 10
        const coldStartTimeInMS = props.coldStartTimeInMS || 500

        const handler = new NodejsFunction(this, 'Fun', {
            entry: 'src/test-function.ts',
            memorySize: 256,
            environment: {
                WORKING_TIME_MILLIS: workingTimeInMS.toString(),
                COLD_START_TIME_MILLIS: coldStartTimeInMS.toString(),
            },
            tracing: lambda.Tracing.ACTIVE,
        })

        this.handler = new lambda.Version(this, 'Version', {
            lambda: handler,
        })
    }
}