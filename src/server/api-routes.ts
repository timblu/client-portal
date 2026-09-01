import type { NextFunction, Request, Response, Router } from "express";
import { isCompanyAdmin } from "@/lib/access";
import { sendForbidden, sendNotFound } from "@/server/errors";
import { mutationErrorStatus } from "@/server/mutation-errors";
import { requireUser } from "@/server/middleware";
import { isMutationAction, runMutation } from "@/server/mutations";
import {
  getBootstrap,
  getClientDeliverable,
  getClientMember,
  getClientMembers,
  getClientProject,
  getClientProjects,
  getStaffCompanies,
  getStaffCompany,
  getStaffDeliverable,
  getStaffMember,
  getStaffMembers,
  getStaffProject,
} from "@/server/queries";
import { getSessionToken, setSessionCookie } from "@/server/session";

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function requireStaff(request: Request, response: Response, next: () => void) {
  if (request.user?.role !== "STAFF") {
    sendForbidden(response, "Staff access required.");
    return;
  }
  next();
}

function requireClient(request: Request, response: Response, next: () => void) {
  if (request.user?.role !== "CLIENT") {
    sendForbidden(response, "Client access required.");
    return;
  }
  next();
}

function requireCompanyAdmin(request: Request, response: Response, next: () => void) {
  if (!request.user || !isCompanyAdmin(request.user)) {
    sendForbidden(response, "Company admin access required.");
    return;
  }
  next();
}

export function registerApiRoutes(router: Router) {
  router.get("/api/bootstrap", requireUser, async (request, response) => {
    response.json(await getBootstrap(request.user!));
  });

  router.get("/api/staff/companies", requireUser, requireStaff, async (request, response) => {
    response.json(await getStaffCompanies(request.user!));
  });

  router.get("/api/staff/companies/:companyId", requireUser, requireStaff, async (request, response) => {
    const data = await getStaffCompany(request.user!, routeParam(request.params.companyId));
    if (!data) {
      sendNotFound(response);
      return;
    }
    response.json(data);
  });

  router.get(
    "/api/staff/companies/:companyId/members",
    requireUser,
    requireStaff,
    async (request, response) => {
      const data = await getStaffMembers(request.user!, routeParam(request.params.companyId));
      if (!data) {
        sendNotFound(response);
        return;
      }
      response.json(data);
    }
  );

  router.get(
    "/api/staff/companies/:companyId/members/:memberId",
    requireUser,
    requireStaff,
    async (request, response) => {
      const data = await getStaffMember(
        request.user!,
        routeParam(request.params.companyId),
        routeParam(request.params.memberId)
      );
      if (!data) {
        sendNotFound(response);
        return;
      }
      response.json(data);
    }
  );

  router.get("/api/staff/projects/:projectId", requireUser, requireStaff, async (request, response) => {
    const data = await getStaffProject(request.user!, routeParam(request.params.projectId));
    if (!data) {
      sendNotFound(response);
      return;
    }
    response.json(data);
  });

  router.get(
    "/api/staff/deliverables/:deliverableId",
    requireUser,
    requireStaff,
    async (request, response) => {
      const versionId = typeof request.query.version === "string" ? request.query.version : undefined;
      const data = await getStaffDeliverable(
        request.user!,
        routeParam(request.params.deliverableId),
        versionId
      );
      if (!data) {
        sendNotFound(response);
        return;
      }
      response.json(data);
    }
  );

  router.get("/api/client/projects", requireUser, requireClient, async (request, response) => {
    response.json(await getClientProjects(request.user!));
  });

  router.get("/api/client/projects/:projectId", requireUser, requireClient, async (request, response) => {
    const data = await getClientProject(request.user!, routeParam(request.params.projectId));
    if (!data) {
      sendNotFound(response);
      return;
    }
    response.json(data);
  });

  router.get(
    "/api/client/deliverables/:deliverableId",
    requireUser,
    requireClient,
    async (request, response) => {
      const versionId = typeof request.query.version === "string" ? request.query.version : undefined;
      const data = await getClientDeliverable(
        request.user!,
        routeParam(request.params.deliverableId),
        versionId
      );
      if (!data) {
        sendNotFound(response);
        return;
      }
      response.json(data);
    }
  );

  router.get("/api/client/members", requireUser, requireClient, requireCompanyAdmin, async (request, response) => {
    const data = await getClientMembers(request.user!);
    if (!data) {
      sendNotFound(response);
      return;
    }
    response.json(data);
  });

  router.get(
    "/api/client/members/:memberId",
    requireUser,
    requireClient,
    requireCompanyAdmin,
    async (request, response) => {
      const data = await getClientMember(request.user!, routeParam(request.params.memberId));
      if (!data) {
        sendNotFound(response);
        return;
      }
      response.json(data);
    }
  );

  router.post("/api/actions/:action", requireUser, async (request, response, next) => {
    try {
      const action = routeParam(request.params.action);
      if (!isMutationAction(action)) {
        sendNotFound(response, "Unknown action.");
        return;
      }

      const currentToken = getSessionToken(request);
      const result = await runMutation(action, request.user!, request.body ?? {}, currentToken);
      if (!result.ok) {
        const status = mutationErrorStatus(result.error);
        response.status(status).json({ error: result.error });
        return;
      }

      if (result.session) {
        setSessionCookie(response, result.session.token, result.session.expiresAt);
      }

      response.status(200).json({
        ok: true,
        ...(result.redirectTo ? { redirectTo: result.redirectTo } : {}),
        ...(result.data ? { data: result.data } : {}),
      });
    } catch (error) {
      next(error);
    }
  });
}
