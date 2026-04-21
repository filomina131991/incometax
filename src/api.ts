const API_URL = import.meta.env.VITE_API_URL || '/api';

const mapId = (obj: any) => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(mapId);
  if (typeof obj === 'object') {
    const newObj = { ...obj };
    if (newObj._id) {
      newObj.id = newObj._id.toString();
    }
    // Recursively map nested objects
    Object.keys(newObj).forEach(key => {
      if (newObj[key] && typeof newObj[key] === 'object') {
        newObj[key] = mapId(newObj[key]);
      }
    });
    return newObj;
  }
  return obj;
};

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || response.statusText);
  }

  const data = await response.json();
  return mapId(data);
};

export const dbService = {
  // Financial Years
  async getActiveFY() {
    const data = await fetchApi('/fy?active=true');
    return data[0] || null;
  },
  async getFinancialYears() {
    return fetchApi('/fy');
  },
  async getAllFYs() {
    return fetchApi('/fy');
  },
  async addFinancialYear(data: any) {
    return fetchApi('/fy', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async createFY(data: any) {
    return this.addFinancialYear(data);
  },
  async updateFinancialYear(id: string, data: any) {
    return fetchApi(`/fy/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async updateFY(id: string, data: any) {
    return this.updateFinancialYear(id, data);
  },
  async deleteFinancialYear(id: string) {
    return fetchApi(`/fy/${id}`, {
      method: 'DELETE',
    });
  },

  // Teachers
  async getTeachers() {
    return fetchApi('/teachers');
  },
  async getAllTeachers() {
    return fetchApi('/teachers');
  },
  async getTeacher(id: string) {
    return fetchApi(`/teachers/${id}`);
  },
  async addTeacher(data: any) {
    return fetchApi('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateTeacher(id: string, data: any) {
    return fetchApi(`/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteTeacher(id: string) {
    return fetchApi(`/teachers/${id}`, {
      method: 'DELETE',
    });
  },

  // Tax Statements
  async getTaxStatements(query: any = {}) {
    const params = new URLSearchParams(query).toString();
    const endpoint = params ? `/tax-statements?${params}` : '/tax-statements';
    return fetchApi(endpoint);
  },
  async getTaxStatement(id: string) {
    return fetchApi(`/tax-statements/${id}`);
  },
  async addTaxStatement(data: any) {
    const { id, ...payload } = data; // Ensure we don't send id for new records
    return fetchApi('/tax-statements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateTaxStatement(id: string, data: any) {
    return fetchApi(`/tax-statements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async saveTaxStatement(data: any) {
    if (data.id && data.id.length > 5) {
      return this.updateTaxStatement(data.id, data);
    } else {
      return this.addTaxStatement(data);
    }
  },

  // Activities
  async getRecentActivities() {
    return fetchApi('/activities');
  },
  async logActivity(activity: any) {
    return fetchApi('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  // KSTA
  async getKstaMembers(fyId: string) {
    return fetchApi(`/ksta?fyId=${fyId}`);
  },
  async importKstaMembers(fyId: string, teacherIds?: string[]) {
    return fetchApi('/ksta/import', {
      method: 'POST',
      body: JSON.stringify({ fyId, teacherIds }),
    });
  },
  async updateKstaMember(id: string, data: any) {
    return fetchApi(`/ksta/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteKstaMember(id: string) {
    return fetchApi(`/ksta/${id}`, {
      method: 'DELETE',
    });
  }
};

export const authService = {
  async login(username: string, password: string) {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  async getProfile() {
    return fetchApi('/auth/me');
  },
  async updateProfile(data: any) {
    const result = await fetchApi('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    // Update local storage with new name
    const user = this.getCurrentUser();
    if (user && data.name) {
      user.name = data.name;
      localStorage.setItem('user', JSON.stringify(user));
    }
    return result;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    return fetchApi('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
};

export default fetchApi;
