-- ============================================================
-- INDEX DE PERFORMANCE - AGENCE APP POPY TECH
-- Ni rebuild_core.sql ni migrations_reconstruction_complete.sql
-- ne posaient d'index au-dela de la clef primaire : chaque filtre
-- (client_id, status, project_id...) forcait un scan complet de
-- la table. Ajoute les index manquants sur les colonnes de jointure
-- (*_id), status et created_at/date les plus utilisees par le code.
-- Tout est en "if not exists" - sans risque, rejouable.
-- A coller dans Supabase > SQL Editor > New Query > Run
-- ============================================================

-- Tables d'origine (rebuild_core.sql)
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);

create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_created_by_idx on public.clients(created_by);
create index if not exists clients_created_at_idx on public.clients(created_at);

create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_created_by_idx on public.projects(created_by);
create index if not exists projects_created_at_idx on public.projects(created_at);

create index if not exists project_members_project_id_idx on public.project_members(project_id);
create index if not exists project_members_user_id_idx on public.project_members(user_id);

create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_parent_task_id_idx on public.tasks(parent_task_id);
create index if not exists tasks_created_at_idx on public.tasks(created_at);

create index if not exists subtasks_task_id_idx on public.subtasks(task_id);
create index if not exists subtasks_assigned_to_idx on public.subtasks(assigned_to);

create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_project_id_idx on public.invoices(project_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_quote_id_idx on public.invoices(quote_id);
create index if not exists invoices_created_by_idx on public.invoices(created_by);
create index if not exists invoices_created_at_idx on public.invoices(created_at);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
create index if not exists payments_recorded_by_idx on public.payments(recorded_by);
create index if not exists payments_created_at_idx on public.payments(created_at);
create index if not exists payments_payment_date_idx on public.payments(payment_date);

create index if not exists expenses_project_id_idx on public.expenses(project_id);
create index if not exists expenses_created_by_idx on public.expenses(created_by);
create index if not exists expenses_created_at_idx on public.expenses(created_at);

create index if not exists quotes_client_id_idx on public.quotes(client_id);
create index if not exists quotes_status_idx on public.quotes(status);
create index if not exists quotes_created_by_idx on public.quotes(created_by);
create index if not exists quotes_created_at_idx on public.quotes(created_at);

create index if not exists appointments_client_id_idx on public.appointments(client_id);
create index if not exists appointments_project_id_idx on public.appointments(project_id);
create index if not exists appointments_created_by_idx on public.appointments(created_by);
create index if not exists appointments_status_idx on public.appointments(status);

create index if not exists publications_client_id_idx on public.publications(client_id);
create index if not exists publications_project_id_idx on public.publications(project_id);
create index if not exists publications_assigned_to_idx on public.publications(assigned_to);
create index if not exists publications_created_by_idx on public.publications(created_by);
create index if not exists publications_status_idx on public.publications(status);
create index if not exists publications_created_at_idx on public.publications(created_at);

create index if not exists trainings_created_by_idx on public.trainings(created_by);

create index if not exists training_modules_training_id_idx on public.training_modules(training_id);

create index if not exists interns_user_id_idx on public.interns(user_id);
create index if not exists interns_mentor_id_idx on public.interns(mentor_id);
create index if not exists interns_status_idx on public.interns(status);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at);

create index if not exists time_entries_user_id_idx on public.time_entries(user_id);
create index if not exists time_entries_project_id_idx on public.time_entries(project_id);
create index if not exists time_entries_task_id_idx on public.time_entries(task_id);
create index if not exists time_entries_created_at_idx on public.time_entries(created_at);

create index if not exists daily_reports_user_id_idx on public.daily_reports(user_id);
create index if not exists daily_reports_report_date_idx on public.daily_reports(report_date);

-- Tables ajoutees (migrations_reconstruction_complete.sql)
create index if not exists prospects_status_idx on public.prospects(status);
create index if not exists prospects_created_at_idx on public.prospects(created_at);
create index if not exists offers_prospect_id_idx on public.offers(prospect_id);
create index if not exists offers_status_idx on public.offers(status);
create index if not exists offers_created_at_idx on public.offers(created_at);
create index if not exists email_logs_offer_id_idx on public.email_logs(offer_id);
create index if not exists email_logs_prospect_id_idx on public.email_logs(prospect_id);
create index if not exists email_logs_created_at_idx on public.email_logs(created_at);
create index if not exists marketing_activities_offer_id_idx on public.marketing_activities(offer_id);
create index if not exists marketing_activities_prospect_id_idx on public.marketing_activities(prospect_id);
create index if not exists marketing_activities_created_at_idx on public.marketing_activities(created_at);
create index if not exists followups_offer_id_idx on public.followups(offer_id);
create index if not exists followups_prospect_id_idx on public.followups(prospect_id);
create index if not exists followups_created_at_idx on public.followups(created_at);
create index if not exists scheduled_followups_offer_id_idx on public.scheduled_followups(offer_id);
create index if not exists scheduled_followups_prospect_id_idx on public.scheduled_followups(prospect_id);
create index if not exists scheduled_followups_status_idx on public.scheduled_followups(status);
create index if not exists scheduled_followups_created_at_idx on public.scheduled_followups(created_at);
create index if not exists sales_leads_status_idx on public.sales_leads(status);
create index if not exists sales_leads_created_at_idx on public.sales_leads(created_at);
create index if not exists proposals_sales_lead_id_idx on public.proposals(sales_lead_id);
create index if not exists proposals_status_idx on public.proposals(status);
create index if not exists proposals_created_at_idx on public.proposals(created_at);
create index if not exists commissions_proposal_id_idx on public.commissions(proposal_id);
create index if not exists commissions_status_idx on public.commissions(status);
create index if not exists commissions_created_at_idx on public.commissions(created_at);
create index if not exists meetings_sales_lead_id_idx on public.meetings(sales_lead_id);
create index if not exists meetings_status_idx on public.meetings(status);
create index if not exists meetings_created_at_idx on public.meetings(created_at);
create index if not exists marketing_kpi_user_id_idx on public.marketing_kpi(user_id);
create index if not exists marketing_kpi_created_at_idx on public.marketing_kpi(created_at);
create index if not exists business_contacts_status_idx on public.business_contacts(status);
create index if not exists business_contacts_created_at_idx on public.business_contacts(created_at);
create index if not exists social_connected_accounts_client_id_idx on public.social_connected_accounts(client_id);
create index if not exists social_connected_accounts_user_id_idx on public.social_connected_accounts(user_id);
create index if not exists social_connected_accounts_platform_page_id_idx on public.social_connected_accounts(platform_page_id);
create index if not exists social_connected_accounts_platform_user_id_idx on public.social_connected_accounts(platform_user_id);
create index if not exists social_connected_accounts_ig_user_id_idx on public.social_connected_accounts(ig_user_id);
create index if not exists social_connected_accounts_created_at_idx on public.social_connected_accounts(created_at);
create index if not exists community_accounts_client_id_idx on public.community_accounts(client_id);
create index if not exists community_accounts_created_at_idx on public.community_accounts(created_at);
create index if not exists community_reviews_client_id_idx on public.community_reviews(client_id);
create index if not exists community_reviews_status_idx on public.community_reviews(status);
create index if not exists community_reviews_created_at_idx on public.community_reviews(created_at);
create index if not exists community_hashtags_client_id_idx on public.community_hashtags(client_id);
create index if not exists community_hashtags_created_at_idx on public.community_hashtags(created_at);
create index if not exists content_ideas_status_idx on public.content_ideas(status);
create index if not exists content_ideas_client_id_idx on public.content_ideas(client_id);
create index if not exists content_ideas_project_id_idx on public.content_ideas(project_id);
create index if not exists content_ideas_user_id_idx on public.content_ideas(user_id);
create index if not exists content_ideas_created_at_idx on public.content_ideas(created_at);
create index if not exists scripts_content_id_idx on public.scripts(content_id);
create index if not exists scripts_created_at_idx on public.scripts(created_at);
create index if not exists productions_content_id_idx on public.productions(content_id);
create index if not exists productions_status_idx on public.productions(status);
create index if not exists productions_created_at_idx on public.productions(created_at);
create index if not exists content_feedback_content_id_idx on public.content_feedback(content_id);
create index if not exists content_feedback_reviewer_id_idx on public.content_feedback(reviewer_id);
create index if not exists content_feedback_created_at_idx on public.content_feedback(created_at);
create index if not exists group_messages_sender_id_idx on public.group_messages(sender_id);
create index if not exists group_messages_created_at_idx on public.group_messages(created_at);
create index if not exists design_tasks_status_idx on public.design_tasks(status);
create index if not exists design_tasks_created_at_idx on public.design_tasks(created_at);
create index if not exists design_deliverables_task_id_idx on public.design_deliverables(task_id);
create index if not exists design_feedbacks_task_id_idx on public.design_feedbacks(task_id);
create index if not exists design_feedbacks_deliverable_id_idx on public.design_feedbacks(deliverable_id);
create index if not exists design_feedbacks_status_idx on public.design_feedbacks(status);
create index if not exists design_feedbacks_created_at_idx on public.design_feedbacks(created_at);
create index if not exists design_resources_created_at_idx on public.design_resources(created_at);
create index if not exists dev_projects_status_idx on public.dev_projects(status);
create index if not exists dev_projects_created_at_idx on public.dev_projects(created_at);
create index if not exists dev_tickets_status_idx on public.dev_tickets(status);
create index if not exists dev_tickets_project_id_idx on public.dev_tickets(project_id);
create index if not exists dev_tickets_created_at_idx on public.dev_tickets(created_at);
create index if not exists bug_reports_project_id_idx on public.bug_reports(project_id);
create index if not exists bug_reports_status_idx on public.bug_reports(status);
create index if not exists bug_reports_created_at_idx on public.bug_reports(created_at);
create index if not exists deployments_project_id_idx on public.deployments(project_id);
create index if not exists deployments_status_idx on public.deployments(status);
create index if not exists deployments_created_at_idx on public.deployments(created_at);
create index if not exists dev_docs_project_id_idx on public.dev_docs(project_id);
create index if not exists dev_docs_created_at_idx on public.dev_docs(created_at);
create index if not exists leaves_status_idx on public.leaves(status);
create index if not exists leaves_created_at_idx on public.leaves(created_at);
create index if not exists hr_leave_requests_employee_id_idx on public.hr_leave_requests(employee_id);
create index if not exists hr_leave_requests_status_idx on public.hr_leave_requests(status);
create index if not exists hr_leave_requests_created_at_idx on public.hr_leave_requests(created_at);
create index if not exists hr_attendance_employee_id_idx on public.hr_attendance(employee_id);
create index if not exists hr_attendance_status_idx on public.hr_attendance(status);
create index if not exists hr_attendance_created_at_idx on public.hr_attendance(created_at);
create index if not exists payroll_status_idx on public.payroll(status);
create index if not exists payroll_created_at_idx on public.payroll(created_at);
create index if not exists internal_announcements_created_at_idx on public.internal_announcements(created_at);
create index if not exists admin_documents_created_at_idx on public.admin_documents(created_at);
create index if not exists stock_created_at_idx on public.stock(created_at);
create index if not exists activity_logs_user_id_idx on public.activity_logs(user_id);
create index if not exists activity_logs_entity_id_idx on public.activity_logs(entity_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at);
create index if not exists enrollments_training_id_idx on public.enrollments(training_id);
create index if not exists enrollments_status_idx on public.enrollments(status);
create index if not exists enrollments_created_at_idx on public.enrollments(created_at);
create index if not exists training_sessions_training_id_idx on public.training_sessions(training_id);
create index if not exists training_sessions_trainer_id_idx on public.training_sessions(trainer_id);
create index if not exists training_sessions_status_idx on public.training_sessions(status);
create index if not exists training_sessions_created_at_idx on public.training_sessions(created_at);
create index if not exists formation_registrations_training_id_idx on public.formation_registrations(training_id);
create index if not exists formation_registrations_session_id_idx on public.formation_registrations(session_id);
create index if not exists formation_registrations_created_at_idx on public.formation_registrations(created_at);
create index if not exists formation_payments_registration_id_idx on public.formation_payments(registration_id);
create index if not exists formation_payments_training_id_idx on public.formation_payments(training_id);
create index if not exists formation_payments_created_at_idx on public.formation_payments(created_at);
create index if not exists session_enrollments_session_id_idx on public.session_enrollments(session_id);
create index if not exists session_enrollments_student_id_idx on public.session_enrollments(student_id);
create index if not exists session_enrollments_status_idx on public.session_enrollments(status);
create index if not exists session_enrollments_created_at_idx on public.session_enrollments(created_at);
create index if not exists training_enrollments_training_id_idx on public.training_enrollments(training_id);
create index if not exists training_enrollments_status_idx on public.training_enrollments(status);
create index if not exists training_enrollments_created_at_idx on public.training_enrollments(created_at);
create index if not exists training_feedback_session_id_idx on public.training_feedback(session_id);
create index if not exists training_feedback_student_id_idx on public.training_feedback(student_id);
create index if not exists training_feedback_created_at_idx on public.training_feedback(created_at);
create index if not exists academy_certifications_student_id_idx on public.academy_certifications(student_id);
create index if not exists academy_certifications_training_id_idx on public.academy_certifications(training_id);
create index if not exists academy_certifications_status_idx on public.academy_certifications(status);
create index if not exists academy_certifications_created_at_idx on public.academy_certifications(created_at);
create index if not exists contracts_status_idx on public.contracts(status);
create index if not exists contracts_client_id_idx on public.contracts(client_id);
create index if not exists contracts_team_member_id_idx on public.contracts(team_member_id);
create index if not exists contracts_created_at_idx on public.contracts(created_at);
create index if not exists client_documents_client_id_idx on public.client_documents(client_id);
create index if not exists client_documents_created_at_idx on public.client_documents(created_at);
create index if not exists cm_documents_client_id_idx on public.cm_documents(client_id);
create index if not exists cm_documents_created_at_idx on public.cm_documents(created_at);
create index if not exists client_project_comments_client_id_idx on public.client_project_comments(client_id);
create index if not exists client_project_comments_deliverable_id_idx on public.client_project_comments(deliverable_id);
create index if not exists client_project_comments_created_at_idx on public.client_project_comments(created_at);
create index if not exists deliverables_project_id_idx on public.deliverables(project_id);
create index if not exists deliverables_status_idx on public.deliverables(status);
create index if not exists deliverables_created_at_idx on public.deliverables(created_at);
create index if not exists project_comments_project_id_idx on public.project_comments(project_id);
create index if not exists project_comments_user_id_idx on public.project_comments(user_id);
create index if not exists project_comments_created_at_idx on public.project_comments(created_at);
create index if not exists project_files_project_id_idx on public.project_files(project_id);
create index if not exists project_files_created_at_idx on public.project_files(created_at);
create index if not exists services_created_at_idx on public.services(created_at);
create index if not exists service_margins_service_id_idx on public.service_margins(service_id);
create index if not exists packs_created_at_idx on public.packs(created_at);
create index if not exists pack_services_pack_id_idx on public.pack_services(pack_id);
create index if not exists pack_services_service_id_idx on public.pack_services(service_id);
create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);
create index if not exists subscriptions_service_id_idx on public.subscriptions(service_id);
create index if not exists subscriptions_pack_id_idx on public.subscriptions(pack_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_created_at_idx on public.subscriptions(created_at);
create index if not exists video_projects_client_id_idx on public.video_projects(client_id);
create index if not exists video_projects_project_id_idx on public.video_projects(project_id);
create index if not exists video_projects_status_idx on public.video_projects(status);
create index if not exists video_projects_created_at_idx on public.video_projects(created_at);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_receiver_id_idx on public.messages(receiver_id);
create index if not exists messages_created_at_idx on public.messages(created_at);
create index if not exists client_messages_client_id_idx on public.client_messages(client_id);
create index if not exists client_messages_created_at_idx on public.client_messages(created_at);
create index if not exists podcast_episodes_status_idx on public.podcast_episodes(status);
create index if not exists podcast_episodes_client_id_idx on public.podcast_episodes(client_id);
create index if not exists podcast_episodes_created_at_idx on public.podcast_episodes(created_at);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
