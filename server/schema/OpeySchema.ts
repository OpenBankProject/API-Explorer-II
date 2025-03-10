
export class UserInput {
    message: string;
    thread_id?: string | null;
    is_tool_call_approval: boolean;
}

export class StreamInput extends UserInput {
    stream_tokens: boolean;
}

export type OpeyPaths = {
    [key: string]: string;
}

export type OpeyConfig = {
    baseUri: string,
    authConfig: any,
    paths: OpeyPaths,
}

export type AuthConfig = {
    consentId: string,
    opeyJWT: string,
}

export interface ConsentRequestResponse {
    consentId: string;
}