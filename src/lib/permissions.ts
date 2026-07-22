/**
 * POPY TECH — Système de permissions par rôle
 * Hiérarchie : super_admin > chef_projet > designer/developpeur/marketeur > stagiaire
 */

export type Role = 'ceo' | 'dirigeant' | 'super_admin' | 'chef_projet' | 'designer' | 'designer_senior' | 'developpeur' | 'marketeur' | 'cm' | 'vidéaste' | 'monteur_video' | 'formateur' | 'responsable_formations' | 'assistante_direction' | 'stagiaire' | 'client' | 'creatrice_contenu' | 'commercial_digital'

export interface Permissions {
  // Navigation
  canViewFinance: boolean
  canViewTeam: boolean
  canViewSettings: boolean
  canViewClients: boolean
  canViewInterns: boolean
  canViewAcademy: boolean
  canViewTimeTracking: boolean
  canViewMarketing: boolean
  canViewProduction: boolean
  canViewDesign: boolean
  canViewCommunity: boolean
  canViewCreator: boolean
  canViewCommercial: boolean
  canViewLegal: boolean
  canViewDev: boolean
  // Actions Projets
  canCreateProject: boolean
  canDeleteProject: boolean
  canAssignTeam: boolean
  // Actions Tâches
  canCreateTask: boolean
  canDeleteTask: boolean
  canAssignTask: boolean
  // Actions Publications
  canCreatePublication: boolean
  canDeletePublication: boolean
  canValidatePublication: boolean
  // Actions Clients
  canCreateClient: boolean
  canDeleteClient: boolean
  // Actions Équipe
  canManageTeam: boolean
  canInviteUser: boolean
  // Actions Finances
  canCreateInvoice: boolean
  canCreateQuote: boolean
  canViewAllFinances: boolean
}

const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  ceo: {
      canViewFinance: true, canViewTeam: true, canViewSettings: true,
      canViewClients: true, canViewInterns: true, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: true,
      canViewProduction: true, canViewDesign: true, canViewCommunity: true, canViewCreator: true, canViewCommercial: true, canViewLegal: true, canViewDev: true,
    canCreateProject: true, canDeleteProject: true, canAssignTeam: true,
    canCreateTask: true, canDeleteTask: true, canAssignTask: true,
    canCreatePublication: true, canDeletePublication: true, canValidatePublication: true,
    canCreateClient: true, canDeleteClient: true,
    canManageTeam: true, canInviteUser: true,
    canCreateInvoice: true, canCreateQuote: true, canViewAllFinances: true,
  },
  dirigeant: {
      canViewFinance: true, canViewTeam: true, canViewSettings: true,
      canViewClients: true, canViewInterns: true, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: true,
      canViewProduction: true, canViewDesign: true, canViewCommunity: true, canViewCreator: true, canViewCommercial: true, canViewLegal: true, canViewDev: true,
    canCreateProject: true, canDeleteProject: true, canAssignTeam: true,
    canCreateTask: true, canDeleteTask: true, canAssignTask: true,
    canCreatePublication: true, canDeletePublication: true, canValidatePublication: true,
    canCreateClient: true, canDeleteClient: true,
    canManageTeam: true, canInviteUser: true,
    canCreateInvoice: true, canCreateQuote: true, canViewAllFinances: true,
  },
    super_admin: {
        canViewFinance: true, canViewTeam: true, canViewSettings: true,
        canViewClients: true, canViewInterns: true, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: true,
        canViewProduction: true, canViewDesign: true, canViewCommunity: true, canViewCreator: true, canViewCommercial: true, canViewLegal: true, canViewDev: true,
      canCreateProject: true, canDeleteProject: true, canAssignTeam: true,
      canCreateTask: true, canDeleteTask: true, canAssignTask: true,
      canCreatePublication: true, canDeletePublication: true, canValidatePublication: true,
      canCreateClient: true, canDeleteClient: true,
      canManageTeam: true, canInviteUser: true,
      canCreateInvoice: true, canCreateQuote: true, canViewAllFinances: true,
    },
    chef_projet: {
        canViewFinance: true, canViewTeam: true, canViewSettings: true,
        canViewClients: true, canViewInterns: true, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: true,
        canViewProduction: true, canViewDesign: true, canViewCommunity: true, canViewCreator: true, canViewCommercial: true, canViewLegal: true, canViewDev: true,
      canCreateProject: true, canDeleteProject: true, canAssignTeam: true,
      canCreateTask: true, canDeleteTask: true, canAssignTask: true,
      canCreatePublication: true, canDeletePublication: true, canValidatePublication: true,
      canCreateClient: true, canDeleteClient: true,
      canManageTeam: true, canInviteUser: true,
      canCreateInvoice: true, canCreateQuote: true, canViewAllFinances: true,
    },
    designer: {
        canViewFinance: false, canViewTeam: true, canViewSettings: false,
        canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
        canViewProduction: false, canViewDesign: true, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
      canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
      canCreateTask: true, canDeleteTask: true, canAssignTask: false,
      canCreatePublication: true, canDeletePublication: false, canValidatePublication: false,
      canCreateClient: false, canDeleteClient: false,
      canManageTeam: false, canInviteUser: false,
      canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
    },
    designer_senior: {
        canViewFinance: false, canViewTeam: true, canViewSettings: false,
        canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
        canViewProduction: false, canViewDesign: true, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
      canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
      canCreateTask: true, canDeleteTask: true, canAssignTask: true,
      canCreatePublication: true, canDeletePublication: true, canValidatePublication: true,
      canCreateClient: false, canDeleteClient: false,
      canManageTeam: false, canInviteUser: false,
      canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
    },
    developpeur: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: true,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: false,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  marketeur: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: true,
      canViewProduction: false, canViewDesign: false, canViewCommunity: true, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: false,
    canCreatePublication: true, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  cm: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: true, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: true,
    canCreatePublication: true, canDeletePublication: true, canValidatePublication: true,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  'vidéaste': {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: true, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: false,
    canCreatePublication: true, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  monteur_video: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: true, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: false,
    canCreatePublication: true, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  formateur: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: false, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: false, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: false,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  responsable_formations: {
    canViewFinance: false, canViewTeam: true, canViewSettings: false,
    canViewClients: false, canViewInterns: true, canViewAcademy: true, canViewTimeTracking: false, canViewMarketing: false,
    canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: true, canViewDev: false,
    canCreateProject: false, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: false, canAssignTask: false,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  assistante_direction: {
    canViewFinance: true, canViewTeam: true, canViewSettings: false,
    canViewClients: true, canViewInterns: true, canViewAcademy: false, canViewTimeTracking: true, canViewMarketing: false,
    canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: true, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: false, canAssignTask: false,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  stagiaire: {
      canViewFinance: false, canViewTeam: false, canViewSettings: false,
      canViewClients: false, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: false, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: false, canAssignTask: false,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  client: {
      canViewFinance: false, canViewTeam: false, canViewSettings: false,
      canViewClients: false, canViewInterns: false, canViewAcademy: false, canViewTimeTracking: false, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: false, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: false, canDeleteTask: false, canAssignTask: false,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  creatrice_contenu: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: false, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: true, canViewCommercial: false, canViewLegal: false, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: false,
    canCreatePublication: true, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: false, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: false, canViewAllFinances: false,
  },
  commercial_digital: {
      canViewFinance: false, canViewTeam: true, canViewSettings: false,
      canViewClients: true, canViewInterns: false, canViewAcademy: true, canViewTimeTracking: true, canViewMarketing: false,
      canViewProduction: false, canViewDesign: false, canViewCommunity: false, canViewCreator: false, canViewCommercial: true, canViewLegal: false, canViewDev: false,
    canCreateProject: true, canDeleteProject: false, canAssignTeam: false,
    canCreateTask: true, canDeleteTask: true, canAssignTask: true,
    canCreatePublication: false, canDeletePublication: false, canValidatePublication: false,
    canCreateClient: true, canDeleteClient: false,
    canManageTeam: false, canInviteUser: false,
    canCreateInvoice: false, canCreateQuote: true, canViewAllFinances: false,
  },
}

export function getPermissions(role: string | undefined | null): Permissions {
  if (!role) return ROLE_PERMISSIONS.stagiaire
  return ROLE_PERMISSIONS[(role as Role)] ?? ROLE_PERMISSIONS.stagiaire
}

export function isAdmin(role: string | undefined | null): boolean {
  return role === 'ceo' || role === 'super_admin' || role === 'chef_projet'
}

export function isChefProjetOrAbove(role: string | undefined | null): boolean {
  return role === 'ceo' || role === 'super_admin' || role === 'chef_projet'
}
