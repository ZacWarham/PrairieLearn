import { assert } from 'chai';
import { step } from 'mocha-steps';
import fetch from 'node-fetch';

import * as sqldb from '@prairielearn/postgres';

import { config } from '../lib/config.js';

import * as helperClient from './helperClient.js';
import * as helperServer from './helperServer.js';

const sql = sqldb.loadSqlEquiv(import.meta.url);

describe('Exam assessment with real-time grading disabled', function () {
  this.timeout(60000);

  const context: Record<string, any> = {};
  context.siteUrl = `http://localhost:${config.serverPort}`;
  context.baseUrl = `${context.siteUrl}/pl`;
  context.courseInstanceBaseUrl = `${context.baseUrl}/course_instance/1`;

  before('set up testing server', async function () {
    await helperServer.before().call(this);
    const results = await sqldb.queryOneRowAsync(sql.select_exam8, []);
    context.assessmentId = results.rows[0].id;
    context.assessmentUrl = `${context.courseInstanceBaseUrl}/assessment/${context.assessmentId}/`;
  });
  after('shut down testing server', helperServer.after);

  step('visit start exam page', async () => {
    const response = await helperClient.fetchCheerio(context.assessmentUrl);
    assert.isTrue(response.ok);

    assert.equal(response.$('#start-assessment').text().trim(), 'Start assessment');

    helperClient.extractAndSaveCSRFToken(context, response.$, 'form');
  });

  step('start the exam', async () => {
    const response = await helperClient.fetchCheerio(context.assessmentUrl, {
      method: 'POST',
      body: new URLSearchParams({
        __action: 'new_instance',
        __csrf_token: context.__csrf_token,
      }),
    });
    assert.isTrue(response.ok);

    // We should have been redirected to the assessment instance
    const assessmentInstanceUrl = response.url;
    assert.include(assessmentInstanceUrl, '/assessment_instance/');
    context.assessmentInstanceUrl = assessmentInstanceUrl;

    const questionUrl = response.$('a:contains("Question 1")').attr('href');
    context.questionUrl = `${context.siteUrl}${questionUrl}`;
  });

  step('check for grade button on the assessment page', async () => {
    const response = await helperClient.fetchCheerio(context.assessmentUrl);
    assert.isTrue(response.ok);

    assert.lengthOf(response.$('form[name="grade-form"]'), 0);
  });

  step('check for grade button on a question page', async () => {
    const response = await helperClient.fetchCheerio(context.questionUrl);
    assert.isTrue(response.ok);

    assert.lengthOf(response.$('button[name="__action"][value="grade"]'), 0);

    helperClient.extractAndSaveCSRFToken(context, response.$, '.question-form');
  });

  step('try to manually grade request on the question page', async () => {
    const response = await fetch(context.assessmentInstanceUrl, {
      method: 'POST',
      body: new URLSearchParams({
        __action: 'grade',
        __csrf_token: context.__csrf_token,
      }),
    });

    assert.isFalse(response.ok);
    assert.equal(response.status, 403);
  });
});
