declare module '@mapbox/mapbox-sdk' {
  interface ClientOptions { accessToken?: string }
  function createClient(opts?: ClientOptions): any;
  const _default: (opts?: ClientOptions) => any;
  export default _default;
}

declare module '@mapbox/mapbox-sdk/services/geocoding' {
  export default function geocoding(client: any): any;
}
