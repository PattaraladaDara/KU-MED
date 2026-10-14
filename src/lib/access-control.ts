export type SystemRole="admin"|"doctor"|"staff"|"nurse"|"pharmacist"|"finance"|"executive";

export const rolePermissions:Record<SystemRole,readonly string[]>={
  admin:["dashboard:view","patients:view","intake:view","clinical:view","appointments:view","payments:view","reports:view","reports:export","evaluations:view","accounts:manage","settings:manage"],
  doctor:["dashboard:view","patients:view","intake:view","clinical:view","clinical:write","certificates:issue","appointments:view","payments:view","reports:view","evaluations:submit","settings:own"],
  staff:["dashboard:view","patients:view","patients:register","patients:update","appointments:view","appointments:manage","documents:print","evaluations:submit","settings:own"],
  nurse:["dashboard:view","patients:view","intake:view","intake:write","clinical:view","appointments:view","evaluations:submit","settings:own"],
  pharmacist:["dashboard:view","patients:view","clinical:view","settings:own"],
  finance:["dashboard:view","patients:view","payments:view","payments:manage","settings:own"],
  executive:["dashboard:view","reports:view","reports:export","settings:own"],
};

export function normalizeRole(role?:string):SystemRole{return role&&role in rolePermissions?role as SystemRole:"staff";}
export function can(role:string|undefined,permission:string){return rolePermissions[normalizeRole(role)].includes(permission);}
export function canOpenPath(role:string|undefined,path:string){const current=normalizeRole(role);if(path.startsWith("/admin"))return current==="admin";if(path.startsWith("/registration"))return can(current,"patients:register");if(path.startsWith("/evaluation"))return can(current,"evaluations:submit")||can(current,"evaluations:manage");if(path.startsWith("/reports"))return can(current,"reports:view");if(path.startsWith("/patients")||path.startsWith("/search")||path.startsWith("/scan"))return can(current,"patients:view");return true;}
