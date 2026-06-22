import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listLeave, getLeave, createLeave, updateLeave, deleteLeave } from "../s4/leaveClient";

const SESSION_DESC = "Session ID from /session/link. Required for principal propagation to S/4.";

const QUERY_SCHEMA = {
  filter: z.string().optional().describe("OData $filter expression (e.g. EmployeeID eq '00001234')"),
  top: z.string().optional().describe("OData $top — max number of records"),
  skip: z.string().optional().describe("OData $skip — records to skip"),
  select: z.string().optional().describe("OData $select — comma-separated field names"),
  expand: z.string().optional().describe("OData $expand — navigation properties"),
  orderby: z.string().optional().describe("OData $orderby expression"),
  sessionId: z.string().optional().describe(SESSION_DESC),
};

function buildQueryParams(args: {
  filter?: string;
  top?: string;
  skip?: string;
  select?: string;
  expand?: string;
  orderby?: string;
}): Record<string, string> {
  const p: Record<string, string> = {};
  if (args.filter) p["$filter"] = args.filter;
  if (args.top) p["$top"] = args.top;
  if (args.skip) p["$skip"] = args.skip;
  if (args.select) p["$select"] = args.select;
  if (args.expand) p["$expand"] = args.expand;
  if (args.orderby) p["$orderby"] = args.orderby;
  return p;
}

function authRequired() {
  const url = process.env.APP_URL ?? "http://localhost:3000";
  return {
    content: [{
      type: "text" as const,
      text: `Authentication required.\n\nOpen ${url}/session/link in your browser, then provide the returned session ID as the sessionId parameter.`,
    }],
  };
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function registerListTool(server: McpServer, name: string, description: string, urlPath: string): void {
  server.registerTool(
    name,
    { description, inputSchema: QUERY_SCHEMA },
    async ({ filter, top, skip, select, expand, orderby, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await listLeave(urlPath, buildQueryParams({ filter, top, skip, select, expand, orderby }), undefined, sessionId);
      return ok(data);
    }
  );
}

export function registerLeaveTools(server: McpServer): void {

  // ── LeaveRequest ────────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_leave_requests",
    "List leave/absence request records. Filter by EmployeeID, status, absence type, date range etc. The set is addressable=false in metadata — prefer get-by-key for single records.",
    "LeaveRequestSet"
  );

  server.registerTool(
    "leave_get_leave_request",
    {
      description: "Get a leave request by composite key (EmployeeID, RequestID, ChangeStateID, LeaveKey).",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        RequestID: z.string().describe("Leave request ID"),
        ChangeStateID: z.string().describe("Change state ID (integer value as string, e.g. '1')"),
        LeaveKey: z.string().describe("Leave key"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, RequestID, ChangeStateID, LeaveKey, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("LeaveRequestSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
        { name: "RequestID", type: "string", value: RequestID },
        { name: "ChangeStateID", type: "int32", value: ChangeStateID },
        { name: "LeaveKey", type: "string", value: LeaveKey },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  server.registerTool(
    "leave_create_leave_request",
    {
      description: "Create a new leave/absence request. CSRF token is fetched automatically.",
      inputSchema: {
        body: z.string().describe(
          'JSON string with leave request fields, e.g. {"EmployeeID":"00001","AbsenceTypeCode":"0100","StartDate":"/Date(1700000000000)/","EndDate":"/Date(1700000000000)/"}'
        ),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ body, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await createLeave("LeaveRequestSet", JSON.parse(body) as object, undefined, sessionId);
      return ok(data);
    }
  );

  server.registerTool(
    "leave_update_leave_request",
    {
      description: "Update an existing leave request by composite key. CSRF token is fetched automatically.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        RequestID: z.string().describe("Leave request ID"),
        ChangeStateID: z.string().describe("Change state ID (integer value as string)"),
        LeaveKey: z.string().describe("Leave key"),
        body: z.string().describe("JSON string with the fields to update"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, RequestID, ChangeStateID, LeaveKey, body, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await updateLeave(
        "LeaveRequestSet",
        [
          { name: "EmployeeID", type: "string", value: EmployeeID },
          { name: "RequestID", type: "string", value: RequestID },
          { name: "ChangeStateID", type: "int32", value: ChangeStateID },
          { name: "LeaveKey", type: "string", value: LeaveKey },
        ],
        JSON.parse(body) as object,
        undefined,
        sessionId
      );
      return ok(data);
    }
  );

  server.registerTool(
    "leave_delete_leave_request",
    {
      description: "Delete a leave request by composite key. CSRF token is fetched automatically.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        RequestID: z.string().describe("Leave request ID"),
        ChangeStateID: z.string().describe("Change state ID (integer value as string)"),
        LeaveKey: z.string().describe("Leave key"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, RequestID, ChangeStateID, LeaveKey, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await deleteLeave(
        "LeaveRequestSet",
        [
          { name: "EmployeeID", type: "string", value: EmployeeID },
          { name: "RequestID", type: "string", value: RequestID },
          { name: "ChangeStateID", type: "int32", value: ChangeStateID },
          { name: "LeaveKey", type: "string", value: LeaveKey },
        ],
        undefined,
        sessionId
      );
      return ok(data);
    }
  );

  // ── Note ────────────────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_notes",
    "List notes/comments attached to leave requests. Filter by RequestID.",
    "NoteSet"
  );

  server.registerTool(
    "leave_get_note",
    {
      description: "Get the note attached to a leave request by RequestID.",
      inputSchema: {
        RequestID: z.string().describe("Leave request ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ RequestID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("NoteSet", [
        { name: "RequestID", type: "string", value: RequestID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── TimeAccount ──────────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_time_accounts",
    "List time-account/quota balances per employee, processing period, account type and deduction period. Includes entitlement, used, available, approved, requested and planned quantities.",
    "TimeAccountSet"
  );

  server.registerTool(
    "leave_get_time_account",
    {
      description: "Get a time account by composite key. Provide dates in ISO format: 2024-01-01T00:00:00.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        ProcessingStartDate: z.string().describe("Processing period start date (ISO: 2024-01-01T00:00:00)"),
        ProcessingEndDate: z.string().describe("Processing period end date (ISO: 2024-01-01T00:00:00)"),
        TimeAccountTypeCode: z.string().describe("Time account type code"),
        DeductionStartDate: z.string().describe("Deduction period start date (ISO: 2024-01-01T00:00:00)"),
        DeductionEndDate: z.string().describe("Deduction period end date (ISO: 2024-01-01T00:00:00)"),
        SeqNo: z.string().describe("Sequence number"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, ProcessingStartDate, ProcessingEndDate, TimeAccountTypeCode, DeductionStartDate, DeductionEndDate, SeqNo, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("TimeAccountSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
        { name: "ProcessingStartDate", type: "datetime", value: ProcessingStartDate },
        { name: "ProcessingEndDate", type: "datetime", value: ProcessingEndDate },
        { name: "TimeAccountTypeCode", type: "string", value: TimeAccountTypeCode },
        { name: "DeductionStartDate", type: "datetime", value: DeductionStartDate },
        { name: "DeductionEndDate", type: "datetime", value: DeductionEndDate },
        { name: "SeqNo", type: "string", value: SeqNo },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  server.registerTool(
    "leave_create_time_account",
    {
      description: "Create a time account record. CSRF token is fetched automatically.",
      inputSchema: {
        body: z.string().describe("JSON string with time account fields"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ body, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await createLeave("TimeAccountSet", JSON.parse(body) as object, undefined, sessionId);
      return ok(data);
    }
  );

  server.registerTool(
    "leave_update_time_account",
    {
      description: "Update a time account by composite key. Provide dates in ISO format: 2024-01-01T00:00:00. CSRF token is fetched automatically.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        ProcessingStartDate: z.string().describe("Processing period start date (ISO: 2024-01-01T00:00:00)"),
        ProcessingEndDate: z.string().describe("Processing period end date (ISO: 2024-01-01T00:00:00)"),
        TimeAccountTypeCode: z.string().describe("Time account type code"),
        DeductionStartDate: z.string().describe("Deduction period start date (ISO: 2024-01-01T00:00:00)"),
        DeductionEndDate: z.string().describe("Deduction period end date (ISO: 2024-01-01T00:00:00)"),
        SeqNo: z.string().describe("Sequence number"),
        body: z.string().describe("JSON string with fields to update"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, ProcessingStartDate, ProcessingEndDate, TimeAccountTypeCode, DeductionStartDate, DeductionEndDate, SeqNo, body, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await updateLeave(
        "TimeAccountSet",
        [
          { name: "EmployeeID", type: "string", value: EmployeeID },
          { name: "ProcessingStartDate", type: "datetime", value: ProcessingStartDate },
          { name: "ProcessingEndDate", type: "datetime", value: ProcessingEndDate },
          { name: "TimeAccountTypeCode", type: "string", value: TimeAccountTypeCode },
          { name: "DeductionStartDate", type: "datetime", value: DeductionStartDate },
          { name: "DeductionEndDate", type: "datetime", value: DeductionEndDate },
          { name: "SeqNo", type: "string", value: SeqNo },
        ],
        JSON.parse(body) as object,
        undefined,
        sessionId
      );
      return ok(data);
    }
  );

  server.registerTool(
    "leave_delete_time_account",
    {
      description: "Delete a time account by composite key. Provide dates in ISO format: 2024-01-01T00:00:00. CSRF token is fetched automatically.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        ProcessingStartDate: z.string().describe("Processing period start date (ISO: 2024-01-01T00:00:00)"),
        ProcessingEndDate: z.string().describe("Processing period end date (ISO: 2024-01-01T00:00:00)"),
        TimeAccountTypeCode: z.string().describe("Time account type code"),
        DeductionStartDate: z.string().describe("Deduction period start date (ISO: 2024-01-01T00:00:00)"),
        DeductionEndDate: z.string().describe("Deduction period end date (ISO: 2024-01-01T00:00:00)"),
        SeqNo: z.string().describe("Sequence number"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, ProcessingStartDate, ProcessingEndDate, TimeAccountTypeCode, DeductionStartDate, DeductionEndDate, SeqNo, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await deleteLeave(
        "TimeAccountSet",
        [
          { name: "EmployeeID", type: "string", value: EmployeeID },
          { name: "ProcessingStartDate", type: "datetime", value: ProcessingStartDate },
          { name: "ProcessingEndDate", type: "datetime", value: ProcessingEndDate },
          { name: "TimeAccountTypeCode", type: "string", value: TimeAccountTypeCode },
          { name: "DeductionStartDate", type: "datetime", value: DeductionStartDate },
          { name: "DeductionEndDate", type: "datetime", value: DeductionEndDate },
          { name: "SeqNo", type: "string", value: SeqNo },
        ],
        undefined,
        sessionId
      );
      return ok(data);
    }
  );

  // ── EntitlementInfo ──────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_entitlement_info",
    "List entitlement KPI summaries per employee and absence type — available entitlement, expiring entitlement, KPI threshold and expiration date.",
    "EntitlementInfoSet"
  );

  server.registerTool(
    "leave_get_entitlement_info",
    {
      description: "Get entitlement KPI summary by EmployeeNumber and AbsenceTypeCode.",
      inputSchema: {
        EmployeeNumber: z.string().describe("Employee personnel number"),
        AbsenceTypeCode: z.string().describe("Absence type code"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeNumber, AbsenceTypeCode, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("EntitlementInfoSet", [
        { name: "EmployeeNumber", type: "string", value: EmployeeNumber },
        { name: "AbsenceTypeCode", type: "string", value: AbsenceTypeCode },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── AbsenceType ──────────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_absence_types",
    "List absence/leave types available to an employee with rules: allowed durations (partial/single/multi day), attachment rules, note visibility, approval flag.",
    "AbsenceTypeSet"
  );

  server.registerTool(
    "leave_get_absence_type",
    {
      description: "Get an absence type by EmployeeID, InfoType, and AbsenceTypeCode.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        InfoType: z.string().describe("Info type (e.g. '2001')"),
        AbsenceTypeCode: z.string().describe("Absence type code"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, InfoType, AbsenceTypeCode, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("AbsenceTypeSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
        { name: "InfoType", type: "string", value: InfoType },
        { name: "AbsenceTypeCode", type: "string", value: AbsenceTypeCode },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── AbsenceTypeAdditionalFieldDefinition (AdditionalFieldSet) ───────────────

  registerListTool(server,
    "leave_list_additional_fields",
    "List additional form-field definitions per absence type — label, required, readonly, init value, F4 value help. Drives dynamic UI fields.",
    "AdditionalFieldSet"
  );

  server.registerTool(
    "leave_get_additional_field",
    {
      description: "Get an additional field definition by EmployeeID, InfoType, AbsenceTypeCode, and Fieldname.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        InfoType: z.string().describe("Info type (e.g. '2001')"),
        AbsenceTypeCode: z.string().describe("Absence type code"),
        Fieldname: z.string().describe("Field name"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, InfoType, AbsenceTypeCode, Fieldname, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("AdditionalFieldSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
        { name: "InfoType", type: "string", value: InfoType },
        { name: "AbsenceTypeCode", type: "string", value: AbsenceTypeCode },
        { name: "Fieldname", type: "string", value: Fieldname },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── EmployeeCalendar ─────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_employee_calendar",
    "List employee working calendar by date — flags working day, public holiday, and holiday long text.",
    "EmployeeCalendarSet"
  );

  server.registerTool(
    "leave_get_employee_calendar",
    {
      description: "Get employee calendar for a specific date by EmployeeNumber and StartDate (ISO: 2024-01-01T00:00:00).",
      inputSchema: {
        EmployeeNumber: z.string().describe("Employee personnel number"),
        StartDate: z.string().describe("Date in ISO format: 2024-01-01T00:00:00"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeNumber, StartDate, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("EmployeeCalendarSet", [
        { name: "EmployeeNumber", type: "string", value: EmployeeNumber },
        { name: "StartDate", type: "datetime", value: StartDate },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── AbsenceTypeApproverDefault (MultipleApproverSet) ────────────────────────

  registerListTool(server,
    "leave_list_approver_defaults",
    "List default approvers per absence type with approver level (Seqnr), name, status and editability. For dynamic multi-level approvers by date range, call the GetMultiLevelApprovers function import directly on the OData endpoint.",
    "MultipleApproverSet"
  );

  server.registerTool(
    "leave_get_approver_default",
    {
      description: "Get a default approver by EmployeeNumber, Infotype, AbsenceTypeCode, and Pernr.",
      inputSchema: {
        EmployeeNumber: z.string().describe("Employee personnel number"),
        Infotype: z.string().describe("Info type (e.g. '2001')"),
        AbsenceTypeCode: z.string().describe("Absence type code"),
        Pernr: z.string().describe("Approver personnel number"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeNumber, Infotype, AbsenceTypeCode, Pernr, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("MultipleApproverSet", [
        { name: "EmployeeNumber", type: "string", value: EmployeeNumber },
        { name: "Infotype", type: "string", value: Infotype },
        { name: "AbsenceTypeCode", type: "string", value: AbsenceTypeCode },
        { name: "Pernr", type: "string", value: Pernr },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── SearchApprover ───────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_search_approvers",
    "List searchable valid approvers for an employee. Supports OData $search. Returns ApproverEmployeeID, ApproverEmployeeName, ApproverUserID.",
    "SearchApproverSet"
  );

  server.registerTool(
    "leave_get_search_approver",
    {
      description: "Get a searchable approver by EmployeeID and ApproverEmployeeID.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        ApproverEmployeeID: z.string().describe("Approver employee ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, ApproverEmployeeID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchApproverSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
        { name: "ApproverEmployeeID", type: "string", value: ApproverEmployeeID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── FileAttachment ───────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_file_attachments",
    "List file attachment metadata for leave requests (HasStream=true). Append /$value to the entity URL to retrieve binary content.",
    "FileAttachmentSet"
  );

  server.registerTool(
    "leave_get_file_attachment",
    {
      description: "Get file attachment metadata by EmployeeID, LeaveRequestId, FileName, and ArchivDocId.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        LeaveRequestId: z.string().describe("Leave request ID"),
        FileName: z.string().describe("File name"),
        ArchivDocId: z.string().describe("Archive document ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, LeaveRequestId, FileName, ArchivDocId, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("FileAttachmentSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
        { name: "LeaveRequestId", type: "string", value: LeaveRequestId },
        { name: "FileName", type: "string", value: FileName },
        { name: "ArchivDocId", type: "string", value: ArchivDocId },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── Configuration ────────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_configurations",
    "List UI/system configuration per employee — busy indicator, industrial-hours flag, default filter date, minimum display date, country grouping.",
    "ConfigurationSet"
  );

  server.registerTool(
    "leave_get_configuration",
    {
      description: "Get UI/system configuration for an employee by EmployeeID.",
      inputSchema: {
        EmployeeID: z.string().describe("Employee personnel number"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EmployeeID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("ConfigurationSet", [
        { name: "EmployeeID", type: "string", value: EmployeeID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  // ── Value-help sets ──────────────────────────────────────────────────────────

  registerListTool(server,
    "leave_list_evaluation_types",
    "F4 value help — evaluation types for attendances/absences with text label.",
    "SearchEvaluationTypeSet"
  );

  server.registerTool(
    "leave_get_evaluation_type",
    {
      description: "Get an evaluation type by EvaluationTypeID.",
      inputSchema: {
        EvaluationTypeID: z.string().describe("Evaluation type ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ EvaluationTypeID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchEvaluationTypeSet", [
        { name: "EvaluationTypeID", type: "string", value: EvaluationTypeID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_illness_descriptions",
    "F4 value help — illness codes with description text.",
    "IlnessDescriptionSet"
  );

  server.registerTool(
    "leave_get_illness_description",
    {
      description: "Get an illness description by IllnessCode.",
      inputSchema: {
        IllnessCode: z.string().describe("Illness code"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ IllnessCode, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("IlnessDescriptionSet", [
        { name: "IllnessCode", type: "string", value: IllnessCode },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_search_illness_descriptions",
    "F4 search variant for illness descriptions (same fields as illness descriptions, supports $search).",
    "SearchIllnessDescrSet"
  );

  server.registerTool(
    "leave_get_search_illness_description",
    {
      description: "Get a search illness description by IllnessCode.",
      inputSchema: {
        IllnessCode: z.string().describe("Illness code"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ IllnessCode, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchIllnessDescrSet", [
        { name: "IllnessCode", type: "string", value: IllnessCode },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_company_codes",
    "F4 value help — company codes with company name.",
    "SearchCompanyCodeSet"
  );

  server.registerTool(
    "leave_get_company_code",
    {
      description: "Get a company code by CompanyCodeID.",
      inputSchema: {
        CompanyCodeID: z.string().describe("Company code ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ CompanyCodeID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchCompanyCodeSet", [
        { name: "CompanyCodeID", type: "string", value: CompanyCodeID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_cost_centers",
    "F4 value help — cost centers with short text.",
    "SearchCostCenterSet"
  );

  server.registerTool(
    "leave_get_cost_center",
    {
      description: "Get a cost center by CostCenterID.",
      inputSchema: {
        CostCenterID: z.string().describe("Cost center ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ CostCenterID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchCostCenterSet", [
        { name: "CostCenterID", type: "string", value: CostCenterID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_object_types",
    "F4 value help — object types.",
    "SearchObjectTypeSet"
  );

  server.registerTool(
    "leave_get_object_type",
    {
      description: "Get an object type by ObjtypeID.",
      inputSchema: {
        ObjtypeID: z.string().describe("Object type ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ ObjtypeID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchObjectTypeSet", [
        { name: "ObjtypeID", type: "string", value: ObjtypeID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_order_numbers",
    "F4 value help — order numbers with description.",
    "SearchOrderNumberSet"
  );

  server.registerTool(
    "leave_get_order_number",
    {
      description: "Get an order number by OrderNumID.",
      inputSchema: {
        OrderNumID: z.string().describe("Order number ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ OrderNumID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchOrderNumberSet", [
        { name: "OrderNumID", type: "string", value: OrderNumID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_ot_compensation_types",
    "F4 value help — overtime compensation types.",
    "SearchOTCompensationTypeSet"
  );

  server.registerTool(
    "leave_get_ot_compensation_type",
    {
      description: "Get an overtime compensation type by OverTimeCompID.",
      inputSchema: {
        OverTimeCompID: z.string().describe("Overtime compensation type ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ OverTimeCompID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchOTCompensationTypeSet", [
        { name: "OverTimeCompID", type: "string", value: OverTimeCompID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_wage_types",
    "F4 value help — wage types per country grouping.",
    "SearchWageTypeSet"
  );

  server.registerTool(
    "leave_get_wage_type",
    {
      description: "Get a wage type by CountryGrouping and WageTypeID.",
      inputSchema: {
        CountryGrouping: z.string().describe("Country grouping code"),
        WageTypeID: z.string().describe("Wage type ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ CountryGrouping, WageTypeID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchWageTypeSet", [
        { name: "CountryGrouping", type: "string", value: CountryGrouping },
        { name: "WageTypeID", type: "string", value: WageTypeID },
      ], undefined, sessionId);
      return ok(data);
    }
  );

  registerListTool(server,
    "leave_list_work_tax_areas",
    "F4 value help — work tax areas with description.",
    "SearchWorkTaxAreaSet"
  );

  server.registerTool(
    "leave_get_work_tax_area",
    {
      description: "Get a work tax area by WorkTaxAreaID.",
      inputSchema: {
        WorkTaxAreaID: z.string().describe("Work tax area ID"),
        sessionId: z.string().optional().describe(SESSION_DESC),
      },
    },
    async ({ WorkTaxAreaID, sessionId }) => {
      if (!sessionId) return authRequired();
      const data = await getLeave("SearchWorkTaxAreaSet", [
        { name: "WorkTaxAreaID", type: "string", value: WorkTaxAreaID },
      ], undefined, sessionId);
      return ok(data);
    }
  );
}
