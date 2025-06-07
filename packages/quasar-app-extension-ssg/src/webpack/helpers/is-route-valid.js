import { extname } from "path";

export default function isRouteValid(route) {
  if (route.startsWith('/') && !route.startsWith('//') && !extname(route)) {
    return true;
  }

  return false;
};
