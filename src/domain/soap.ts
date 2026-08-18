export type SoapVersion = "1.1" | "1.2";

export type SoapScalar = string | number | boolean | null;
export type SoapValue = SoapScalar | SoapValue[] | { [key: string]: SoapValue };

export type SoapRequest = {
  version: SoapVersion;
  operation: string;
  namespace: string;
  correlationId: string;
  payload: Record<string, SoapValue>;
  action?: string;
};

export type SoapFault = {
  code: string | null;
  reason: string | null;
  detail: unknown;
};

export type SoapSuccess = {
  ok: true;
  statusCode: number;
  body: unknown;
};

export type SoapFailureKind =
  | "configuration"
  | "network"
  | "timeout"
  | "http"
  | "fault"
  | "invalid_xml"
  | "response_too_large";

export type SoapFailure = {
  ok: false;
  kind: SoapFailureKind;
  statusCode: number | null;
  message: string;
  fault: SoapFault | null;
};

export type SoapResult = SoapSuccess | SoapFailure;
