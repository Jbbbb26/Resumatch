import * as companyService from '../data/services/companyService';
import { addGalleryPhotos, removeCompanyLogo, removeGalleryPhoto, uploadCompanyLogo } from '../data/services/companyMedia';
import { fetchPublicCompany } from '../data/services/publicData';

const companyActions = Object.freeze({
  ...companyService,
  addGalleryPhotos,
  removeCompanyLogo,
  removeGalleryPhoto,
  uploadCompanyLogo,
  fetchPublicCompany,
});

export function useCompanyData() {
  return companyActions;
}
