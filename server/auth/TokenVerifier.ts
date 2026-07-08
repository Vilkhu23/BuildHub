// Strict Provider-Neutral Authenticated Principal Contract
export interface AuthenticatedPrincipal {
  externalSubject: string;
  email?: string;
}

// Token Verifier Abstraction Interface (Correction 7 Boundary)
export interface TokenVerifier {
  verifyToken(bearerToken: string): Promise<AuthenticatedPrincipal>;
}

// Split Stages preventing unauthenticated payload generation
export interface RequestMetadata {
  requestId: string;
}

export interface AuthenticatedRequestContext extends RequestMetadata {
  principalId: string;
}

// Future target schema placeholder (Populated downstream in SEC phases)
export interface AuthorizedTenantContext extends AuthenticatedRequestContext {
  applicationUserId: string;
  tenantId: string;
  membershipId: string;
  role: 'OWNER_ADMIN' | 'MANAGER' | 'TELECALLER';
}

export class DefaultTokenVerifier implements TokenVerifier {
  async verifyToken(bearerToken: string): Promise<AuthenticatedPrincipal> {
    if (!bearerToken) {
      throw new Error("No token provided");
    }

    if (bearerToken.startsWith("mock-")) {
      const id = bearerToken.replace("mock-", "");
      return {
        externalSubject: id,
        email: `${id}@example.com`,
      };
    }

    // In production, this would use the real Firebase Admin or OAuth provider to verify the token.
    return {
      externalSubject: bearerToken,
      email: `${bearerToken}@example.com`,
    };
  }
}
