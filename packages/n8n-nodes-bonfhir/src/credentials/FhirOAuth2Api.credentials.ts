import { ICredentialType, INodeProperties } from "n8n-workflow";

export class FhirOAuth2Api implements ICredentialType {
  name = "fhirOAuth2Api";
  extends = ["oAuth2Api"];
  displayName = "FHIR OAuth2 API";
  documentationUrl = "https://bonfhir.dev/packages/n8n-nodes-bonfhir";
  properties: INodeProperties[] = [
    {
      displayName: "Grant Type",
      name: "grantType",
      type: "hidden",
      default: "authorizationCode",
    },
    {
      displayName: "Authorization URL",
      name: "authUrl",
      type: "string",
      default: "http://localhost:8103/oauth2/authorize",
      required: true,
    },
    {
      displayName: "Access Token URL",
      name: "accessTokenUrl",
      type: "string",
      default: "http://localhost:8103/oauth2/token",
      required: true,
    },
    {
      displayName: "Scope",
      name: "scope",
      type: "hidden",
      default: "openid",
      required: true,
    },
    {
      displayName: "Auth URI Query Parameters",
      name: "authQueryParameters",
      type: "hidden",
      default: "",
    },
    {
      displayName: "Authentication",
      name: "authentication",
      type: "hidden",
      default: "body",
    },
  ];
}
