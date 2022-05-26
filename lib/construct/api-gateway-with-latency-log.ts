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
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as api from "aws-cdk-lib/aws-apigateway";
import {RemovalPolicy} from "aws-cdk-lib";
import {IFunction} from "aws-cdk-lib/aws-lambda";

export interface ApiGatewayWithLatencyLogProps {
    /**
     * List of endpoint integration to be created
     */
    endpoints: {
        /** Endpoint name */
        endpoint: string,
        /** Lambda handler */
        handler: IFunction }[],
}

/**
 * ApiGateway with Lambda integration for each given endpoint.
 */
export class ApiGatewayWithLatencyLog extends Construct {
    readonly api: api.RestApi
    readonly log: logs.ILogGroup

    constructor(scope: Construct, id: string, props: ApiGatewayWithLatencyLogProps) {
        super(scope, id);

        //Log group for API Gateway access logs
        const logGroup = new logs.LogGroup(this, 'RestApiLogs', {
            removalPolicy: RemovalPolicy.DESTROY
        })
        logGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com'));

        //API Gateway
        const apiGateway = new api.RestApi(this, 'RestApi', {
            deployOptions: {
                accessLogDestination: new api.LogGroupLogDestination(logGroup),
                // extending standard format with integration and response latency
                accessLogFormat: api.AccessLogFormat.custom(JSON.stringify({
                    requestId: api.AccessLogField.contextRequestId(),
                    extendedRequestId: api.AccessLogField.contextExtendedRequestId(),
                    ip: api.AccessLogField.contextIdentitySourceIp(),
                    caller: api.AccessLogField.contextIdentityCaller(),
                    user: api.AccessLogField.contextIdentityUser(),
                    requestTime: api.AccessLogField.contextRequestTime(),
                    httpMethod: api.AccessLogField.contextHttpMethod(),
                    resourcePath: api.AccessLogField.contextResourcePath(),
                    status: api.AccessLogField.contextStatus(),
                    protocol: api.AccessLogField.contextProtocol(),
                    responseLength: api.AccessLogField.contextResponseLength(),
                    integrationLatency: api.AccessLogField.contextIntegrationLatency(),
                    responseLatency: api.AccessLogField.contextResponseLatency(),
                })),
                loggingLevel: api.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                tracingEnabled: true,
                metricsEnabled: true,
            }
        })

        //API Endpoints
        props.endpoints.forEach(({endpoint, handler}) => {
            //add endpoint for lambda handler
            apiGateway.root.addResource(endpoint).addMethod('GET', new api.LambdaIntegration(handler, {}), {
                methodResponses: [{statusCode: '200'}],
                authorizationType: api.AuthorizationType.NONE,
            })
        })

        this.api = apiGateway
        this.log = logGroup
    }
}