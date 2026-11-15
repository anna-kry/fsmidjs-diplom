import axios, { AxiosInstance } from 'axios';

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export default http;
