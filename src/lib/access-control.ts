export type SystemRole="admin"|"doctor"|"staff"|"nurse"|"pharmacist"|"finance"|"executive";

export const rolePermissions:Record<SystemRole,readonly string[]>={
  admin:["dashboard:view","patients:view","intake:view","clinical:view","appointments:view","payments:view","reports:view","reports:export","evaluations:submit","evaluations:view","evaluations:manage","accounts:manage","settings:manage"],
  doctor:["evaluations:submit","evaluations:view","dashboard:view","patients:view","clinical:view","clinical:write","medications:catalog:use","appointments:view","appointments:manage","documents:print","certificates:issue","settings:own"],
  staff:["evaluations:view","dashboard:view","patients:view","patients:register","patients:update","appointments:view","appointments:manage","documents:print","evaluations:submit","settings:own"],
  nurse:["evaluations:view","dashboard:view","patients:view","intake:view","intake:write","clinical:view","clinical:write","medications:catalog:use","appointments:view","appointments:manage","medications:view","medications:manage","payments:view","payments:manage","service-catalog:use","documents:print","evaluations:submit","settings:own"],
  pharmacist:["evaluations:submit","evaluations:view","dashboard:view","patients:view","medications:view","medications:manage","medications:catalog:use","medications:catalog:manage","documents:print","settings:own"],
  finance:["evaluations:submit","evaluations:view","dashboard:view","patients:view","payments:view","payments:manage","reports:view","reports:export","finance:manage","service-catalog:use","service-catalog:manage","documents:print","settings:own"],
  executive:["evaluations:submit","evaluations:view","dashboard:view","reports:view","reports:export","settings:own"],
};

export function normalizeRole(role?:string):SystemRole{return role&&role in rolePermissions?role as SystemRole:"staff";}
export function can(role:string|undefined,permission:string){return rolePermissions[normalizeRole(role)].includes(permission);}
export function canOpenPath(role:string|undefined,path:string){const current=normalizeRole(role);if(path.startsWith("/admin"))return current==="admin";if(path.startsWith("/registration"))return can(current,"patients:register");if(path.startsWith("/evaluation"))return can(current,"evaluations:view")||can(current,"evaluations:submit");if(path.startsWith("/reports"))return can(current,"reports:view");if(path.startsWith("/patients")||path.startsWith("/search")||path.startsWith("/scan"))return can(current,"patients:view");return true;}
