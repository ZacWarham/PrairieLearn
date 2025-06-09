-- BLOCK select_assessment_instances
WITH
  user_group_ids AS (
    SELECT
      g.id
    FROM
      groups g
      JOIN group_users gu ON g.id = gu.group_id
    WHERE
      g.deleted_at IS NULL
      AND gu.user_id = $user_id
  ),
  assessment_instances_for_user AS (
    SELECT
      *
    FROM
      assessment_instances ai
    WHERE
      ai.user_id = $user_id
      OR ai.group_id IN (
        SELECT
          id
        FROM
          user_group_ids
      )
  ),
  assessments_with_instances AS (
    SELECT
      a.group_work AS assessment_group_work,
      CASE
        WHEN a.multiple_instance THEN a.title || ' instance #' || ai.number
        ELSE a.title
      END AS title,
      aset.heading AS assessment_set_heading,
      aset.color AS assessment_set_color,
      CASE
        WHEN a.multiple_instance THEN aset.abbreviation || a.number || '#' || ai.number
        ELSE aset.abbreviation || a.number
      END AS label,
      ai.score_perc AS assessment_instance_score_perc,
      aa.show_closed_assessment_score,
      aset.id AS assessment_set_id,
      a.order_by,
      a.id AS assessment_id,
      ai.number AS instance_number
    FROM
      assessment_instances_for_user ai
      JOIN assessments a ON a.id = ai.assessment_id
      JOIN course_instances ci ON ci.id = a.course_instance_id
      JOIN assessment_sets aset ON aset.id = a.assessment_set_id
      LEFT JOIN LATERAL authz_assessment (a.id, $authz_data, $req_date, ci.display_timezone) aa ON TRUE
    WHERE
      ci.id = $course_instance_id
      AND a.deleted_at IS NULL
  ),
  assessments_without_instances AS (
    SELECT
      a.group_work AS assessment_group_work,
      a.title,
      aset.heading AS assessment_set_heading,
      aset.color AS assessment_set_color,
      aset.abbreviation || a.number AS label,
      NULL::integer AS assessment_instance_score_perc,
      aa.show_closed_assessment_score,
      aset.id AS assessment_set_id,
      a.order_by,
      a.id AS assessment_id,
      NULL::integer AS instance_number
    FROM
      assessments a
      JOIN course_instances ci ON ci.id = a.course_instance_id
      JOIN assessment_sets aset ON aset.id = a.assessment_set_id
      LEFT JOIN LATERAL authz_assessment (a.id, $authz_data, $req_date, ci.display_timezone) aa ON TRUE
    WHERE
      ci.id = $course_instance_id
      AND a.deleted_at IS NULL
      AND aa.authorized
      AND NOT EXISTS (
        SELECT
          1
        FROM
          assessment_instances_for_user ai
        WHERE
          ai.assessment_id = a.id
      )
  )
SELECT
  *,
  LAG(assessment_set_id) OVER (
    PARTITION BY
      assessment_set_id
    ORDER BY
      order_by,
      assessment_id,
      instance_number
  ) IS NULL AS start_new_set
FROM
  (
    SELECT
      *
    FROM
      assessments_with_instances
    UNION ALL
    SELECT
      *
    FROM
      assessments_without_instances
  ) all_rows
ORDER BY
  assessment_set_id,
  order_by,
  assessment_id,
  instance_number NULLS FIRST;
