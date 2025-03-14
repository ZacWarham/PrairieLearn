import {
  AutoScalingClient,
  CompleteLifecycleActionCommand,
  DescribeAutoScalingInstancesCommand,
} from '@aws-sdk/client-auto-scaling';

import { logger } from '@prairielearn/logger';

import { makeAwsClientConfig } from './aws.js';
import { config } from './config.js';

/**
 * Gets the lifecycle state of the current EC2 instance.
 */
async function getInstanceLifecycleState(client: AutoScalingClient): Promise<string | undefined> {
  const res = await client.send(
    new DescribeAutoScalingInstancesCommand({
      InstanceIds: [config.instanceId],
    }),
  );

  return res.AutoScalingInstances?.[0]?.LifecycleState;
}

export async function completeInstanceLaunch() {
  if (
    !config.runningInEc2 ||
    !config.autoScalingGroupName ||
    !config.autoScalingLaunchingLifecycleHookName
  ) {
    logger.verbose('Lifecycle hooks not configured; skipping launching hook');
    return;
  }

  const client = new AutoScalingClient(makeAwsClientConfig({ maxAttempts: 3 }));

  // If we're starting outside the context of an Auto Scaling lifecycle change
  // (e.g. a restart after a process crash), there won't be a lifecycle action
  // to complete.
  const lifecycleState = await getInstanceLifecycleState(client);
  if (lifecycleState !== 'Pending:Wait' && lifecycleState !== 'Warmed:Pending:Wait') {
    return;
  }

  logger.info('Completing Auto Scaling lifecycle action for instance launch...');
  await client.send(
    new CompleteLifecycleActionCommand({
      LifecycleActionResult: 'CONTINUE',
      AutoScalingGroupName: config.autoScalingGroupName,
      LifecycleHookName: config.autoScalingLaunchingLifecycleHookName,
      InstanceId: config.instanceId,
    }),
  );
  logger.info('Completed Auto Scaling lifecycle action for instance launch');
}

export async function completeInstanceTermination() {
  if (
    !config.runningInEc2 ||
    !config.autoScalingGroupName ||
    !config.autoScalingTerminatingLifecycleHookName
  ) {
    logger.verbose('Lifecycle hooks not configured; skipping terminating hook');
    return;
  }

  const client = new AutoScalingClient(makeAwsClientConfig({ maxAttempts: 3 }));

  // If we're terminating outside the context of an Auto Scaling lifecycle change
  // (e.g. via `systemctl stop`), there won't be a lifecycle action to complete.
  const lifecycleState = await getInstanceLifecycleState(client);
  if (lifecycleState !== 'Terminating:Wait' && lifecycleState !== 'Warmed:Terminating:Wait') {
    return;
  }

  logger.info('Completing Auto Scaling lifecycle action for instance termination...');
  await client.send(
    new CompleteLifecycleActionCommand({
      LifecycleActionResult: 'CONTINUE',
      AutoScalingGroupName: config.autoScalingGroupName,
      LifecycleHookName: config.autoScalingTerminatingLifecycleHookName,
      InstanceId: config.instanceId,
    }),
  );
  logger.info('Completed Auto Scaling lifecycle action for instance termination');
}
