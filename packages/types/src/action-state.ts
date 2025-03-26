import { z } from 'zod';

export const ActionStateSchema = z.object({
  hlp: z.object({
    plan_id: z.string().uuid(),
    observation_reflection: z.string(),
    plan: z.string().array(),
    plan_reasoning: z.string(),
    change_indicator: z.string().nullable(),
    log: z.any().array(),
    current_state_of_execution: z.string(),
  }),
  current_task: z.object({
    task_id: z.string().uuid(),
    task: z.string(),
    location_id: z.string(),
    task_reasoning: z.string(),
    llp: z
      .object({
        plan_id: z.string().uuid(),
        plan_reasoning: z.string(),
        situation_analysis: z.string(),
        plan: z.string().array(),
        reflection: z.string(),
        change_indicator: z.string().nullable(),
      })
      .nullable(),
    task_result: z.any().nullable(),
  }),
  recent_reasoning: z.array(
    z
      .object({
        id: z.string(),
        plan_reflection: z.string(),
        plan_reasoning: z.string(),
        next_task_reasoning: z.string(),
        task: z.string(),
        worker_id: z.string(),
        actions: z.array(
          z.object({
            id: z.string(),
            task_reflection: z.string(),
            task_reasoning: z.string(),
            next_step_reasoning: z.string(),
            fn_name: z.string(),
          }),
        ),
      })
      .nullable(),
  ),
});

export type ActionState = z.infer<typeof ActionStateSchema>;
