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
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import {LogQueryVisualizationType, PeriodOverride} from "aws-cdk-lib/aws-cloudwatch";
import {Duration} from "aws-cdk-lib";
import {RestApi} from "aws-cdk-lib/aws-apigateway/lib/restapi";
import {ILogGroup} from "aws-cdk-lib/aws-logs";
import {IFunction} from "aws-cdk-lib/aws-lambda";

export interface QuickDashboardProps {
    /**
     * API Gateway to plot metrics for
     */
    apiGateway: RestApi,
    /**
     * API Gateway access log to query summary
     */
    logGroup: ILogGroup,
    /**
     * List of lambda functions to plot metrics for
     */
    lambdas: {
        /** Label to be used on the plot */
        label: string,
        /** Lambda handler */
        fun: IFunction
    }[],
    /**
     * Period for all widgets. Defaults to 30 seconds.
     */
    period?: Duration,
}

/**
 * Construct defines dashboard with six graph widgets and a summary showing metrics useful to analyze lambda autoscaling
 */
export class QuickDashboard extends Construct {
    constructor(scope: Construct, id: string, props: QuickDashboardProps) {
        super(scope, id);

        const period = props.period || Duration.seconds(30);

        // Api Latency: Latency is the time between when API Gateway receives a
        // request from a client and when it returns a response to the client.
        // Integration latency is the time between when API Gateway relays a request
        // to the backend and when it receives a response from the backend.
        // The latency includes the integration latency and other API Gateway overhead.
        const apiLatencyWidget = new cloudwatch.GraphWidget({
            title: 'Api Latency',
            width: 8,
            left: [
                props.apiGateway.metricLatency({period}),
                props.apiGateway.metricIntegrationLatency({period}),
            ],
        })

        // Api Number of Calls: Count is the total number of API requests in a given period (in this example 30 seconds).
        // 4XXError is the number of client-side errors and 5XXError is the number of server-side errors captured in a given period.
        const apiCallsWidget = new cloudwatch.GraphWidget({
            title: 'Api Number of Calls',
            width: 8,
            left: [
                props.apiGateway.metricCount({period}),
                props.apiGateway.metricClientError({period}),
                props.apiGateway.metricServerError({period}),
            ]
        })

        // Api Calls Per Second: This is the calculation done to illustrate number of API request per second
        const apiCallsPerSecondWidget = new cloudwatch.GraphWidget({
            title: 'Api Calls Per Second',
            width: 8,
            left: [
                new cloudwatch.MathExpression({
                    period,
                    expression: 'm1/PERIOD(m1)',
                    usingMetrics: {
                        m1: props.apiGateway.metricCount({period: Duration.seconds(60)}),
                    },
                    label: 'ApiCallsPerSecond'
                }),
            ]
        })

        // Summary: These are the calculations from the API access logs for each endpoint showing time statistic.
        const apiCallsSummary = new cloudwatch.LogQueryWidget({
            title: 'Summary',
            logGroupNames: [props.logGroup.logGroupName],
            width: 16,
            view: LogQueryVisualizationType.TABLE,
            queryString: `
                fields responseLatency
                | stats count(*) as count, min(responseLatency) as minimal, max(responseLatency) as maximal, pct(responseLatency, 50) as p50, pct(responseLatency, 90) as p90, pct(responseLatency, 99) as p99 by resourcePath, status`
        })

        //Lambda Concurrent Executions: Graphs without suffix show number of parallel Lambda instances being executed.
        // The -'Provisioned' graphs show how many of those parallel Lambdas are from Provisioned pool.
        const lambdaConcurrentExec = new cloudwatch.GraphWidget({
            title: 'Lambda Concurrent Executions',
            width: 8,
            left: props.lambdas.map((l) => l.fun.metric('ConcurrentExecutions', {
                period,
                label: l.label,
                statistic: 'max',
            })).concat(
                props.lambdas.map((l) => l.fun.metric('ProvisionedConcurrentExecutions', {
                    period,
                    label: `${l.label}-Provisioned`,
                    statistic: 'max',
                }))),
        });

        // Lambda Invocations: Graphs without suffix present total number of invocations for each function.
        // The '-Spillover' graphs show how many invocation are against instances that are not in the Provisioned pool.
        const lambdaInvocations = new cloudwatch.GraphWidget({
            title: 'Lambda Invocations',
            width: 8,
            left: props.lambdas.map((l) => l.fun.metricInvocations({period, label: l.label})).concat(
                props.lambdas.map((l) => l.fun.metric('ProvisionedConcurrencySpilloverInvocations', {
                    period,
                    label: `${l.label}-Spillover`,
                    statistic: 'sum',
                }))),
        });

        // Lambda Duration: Avarage and maximum duration time for each function
        const lambdaLatency = new cloudwatch.GraphWidget({
            title: 'Lambda Duration',
            width: 8,
            left: props.lambdas.map((l) => l.fun.metricDuration({period, label: `${l.label}-avg`})).concat(
                props.lambdas.map((l) => l.fun.metricDuration({period, label: `${l.label}-max`, statistic: 'max'}))),
        })

        // Dashboard including all above widgets
        new cloudwatch.Dashboard(this, 'Dashboard', {
            dashboardName: id,
            periodOverride: PeriodOverride.AUTO,
            widgets: [
                [apiLatencyWidget, apiCallsWidget, apiCallsPerSecondWidget],
                [lambdaLatency, lambdaInvocations, lambdaConcurrentExec],
                [apiCallsSummary,]
            ]
        })
    }
}