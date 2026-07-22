/**
 * Mapping rôle → page métier de destination après connexion.
 * Super admin et CEO arrivent sur /dashboard (vue globale).
 * Tous les autres rôles arrivent directement sur leur espace métier.
 */
export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'super_admin':
      return '/dashboard'
    case 'ceo':
    case 'dirigeant':
      return '/dashboard'
    case 'chef_projet':
      return '/dashboard/projects'
    case 'commercial_digital':
      return '/dashboard/commercial'
    case 'designer':
    case 'designer_senior':
      return '/dashboard/design'
    case 'developpeur':
      return '/dashboard/dev'
    case 'marketeur':
      return '/dashboard/marketing'
    case 'cm':
      return '/dashboard/community'
    case 'vidéaste':
    case 'monteur_video':
      return '/dashboard/production'
    case 'formateur':
      return '/dashboard/formations'
    case 'responsable_formations':
      return '/dashboard/academy'
    case 'assistante_direction':
      return '/dashboard/assistante'
    case 'creatrice_contenu':
      return '/dashboard/creator'
    case 'stagiaire':
      return '/dashboard/interns'
    case 'client':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}
