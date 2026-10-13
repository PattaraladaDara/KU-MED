export type SystemRole="admin"|"doctor"|"staff";

export const rolePermissions:Record<SystemRole,readonly string[]>={
  admin:["dashboard:view","patients:view","patients:register","reports:view","evaluations:manage","accounts:manage","settings:manage"],
  doctor:["dashboard:view","patients:view","clinical:write","certificates:issue","appointments:view","reports:view","evaluations:submit","settings:own"],
  staff:["dashboard:view","patients:view","patients:register","appointments:manage","payments:manage","reports:view","evaluations:submit","settings:own"],
};

export function normalizeRole(role?:string):SystemRole{return role==="admin"||role==="doctor"?role:"staff";}
export function can(role:string|undefined,permission:string){return rolePermissions[normalizeRole(role)].includes(permission);}
export function canOpenPath(role:string|undefined,path:string){const current=normalizeRole(role);if(path.startsWith("/admin"))return current==="admin";if(path.startsWith("/registration"))return can(current,"patients:register");if(path.startsWith("/evaluation"))return can(current,"evaluations:submit")||can(current,"evaluations:manage");if(path.startsWith("/reports"))return can(current,"reports:view");if(path.startsWith("/patients")||path.startsWith("/search")||path.startsWith("/scan"))return can(current,"patients:view");return true;}
