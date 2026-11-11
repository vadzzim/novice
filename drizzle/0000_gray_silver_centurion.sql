CREATE TABLE "actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkin_id" integer NOT NULL,
	"action_text" text NOT NULL,
	"assignee" text NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "actions_checkin_id_unique" UNIQUE("checkin_id"),
	CONSTRAINT "actions_text_length" CHECK (char_length("actions"."action_text") between 1 and 500),
	CONSTRAINT "actions_assignee_length" CHECK (char_length("actions"."assignee") between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"day" smallint NOT NULL,
	"q_clear" text NOT NULL,
	"q_equipped" text NOT NULL,
	"q_support" text NOT NULL,
	"q_mood" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_employee_day_unique" UNIQUE("employee_id","day"),
	CONSTRAINT "checkins_day_check" CHECK ("checkins"."day" in (1, 7)),
	CONSTRAINT "checkins_q_clear_check" CHECK ("checkins"."q_clear" in ('да', 'частично', 'нет')),
	CONSTRAINT "checkins_q_equipped_check" CHECK ("checkins"."q_equipped" in ('да', 'нет')),
	CONSTRAINT "checkins_q_support_check" CHECK ("checkins"."q_support" in ('да', 'нет')),
	CONSTRAINT "checkins_q_mood_check" CHECK ("checkins"."q_mood" in ('хорошо', 'так себе', 'думаю об уходе')),
	CONSTRAINT "checkins_details_length" CHECK (char_length("checkins"."details") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"position" text NOT NULL,
	"start_date" date NOT NULL,
	"token" text NOT NULL,
	CONSTRAINT "employees_token_unique" UNIQUE("token"),
	CONSTRAINT "employees_department_check" CHECK ("employees"."department" in ('склад', 'магазин', 'продажи', 'офис'))
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_checkin_id_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."checkins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;