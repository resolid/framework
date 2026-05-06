import type { JSX } from "react/jsx-runtime";
import { Link, type LinkProps, NavLink, type NavLinkProps } from "react-router";

export function HistoryLink(props: LinkProps): JSX.Element {
  const { state, to, ...rest } = props;

  return <Link to={to} state={{ ...state, previous: true }} {...rest} />;
}

export function HistoryNavLink(props: NavLinkProps): JSX.Element {
  const { state, to, ...rest } = props;

  return <NavLink to={to} state={{ ...state, previous: true }} {...rest} />;
}
