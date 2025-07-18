/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/library`; params?: Router.UnknownInputParams; } | { pathname: `/player`; params?: Router.UnknownInputParams; } | { pathname: `/playlist-detail`; params?: Router.UnknownInputParams; } | { pathname: `/playlist`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/library`; params?: Router.UnknownOutputParams; } | { pathname: `/player`; params?: Router.UnknownOutputParams; } | { pathname: `/playlist-detail`; params?: Router.UnknownOutputParams; } | { pathname: `/playlist`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/library${`?${string}` | `#${string}` | ''}` | `/player${`?${string}` | `#${string}` | ''}` | `/playlist-detail${`?${string}` | `#${string}` | ''}` | `/playlist${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/library`; params?: Router.UnknownInputParams; } | { pathname: `/player`; params?: Router.UnknownInputParams; } | { pathname: `/playlist-detail`; params?: Router.UnknownInputParams; } | { pathname: `/playlist`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}
