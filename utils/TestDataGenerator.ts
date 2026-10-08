/** Shape of a freshly generated user registration. */
export interface UserData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  nid: string;
}

export type AgentData = UserData;

export class TestDataGenerator {
  private static capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /**
   * Builds a unique user for the given `tag` (e.g. "agent" / "customer").
   *
   * @param gmailBaseLocal local-part of the mailbox that receives the OTP
   * @param password       password to register with
   * @param tag            role tag, used in the name and e-mail alias
   * @param offset         added to the timestamp so two users generated in the
   *                       same millisecond still get distinct phone/NID values
   */
  static uniqueUser(
    gmailBaseLocal: string,
    password: string,
    tag = 'user',
    offset = 0,
  ): UserData {
    if (!gmailBaseLocal) {
      throw new Error(
        'GMAIL_BASE_LOCAL is not set. Set it in .env to the local-part of the ' +
          'Gmail address that receives the login OTP (e.g. "yourname").',
      );
    }

    const stamp = (Date.now() + offset).toString();
    const tail9 = stamp.slice(-9); // 9 digits -> 11-digit phone with "01" prefix
    const tail10 = stamp.slice(-10); // valid 7-13 digit NID

    return {
      fullName: `${TestDataGenerator.capitalize(tag)} QA ${stamp}`,
      email: `${gmailBaseLocal}+${tag}${stamp}@gmail.com`,
      password,
      phone: `01${tail9}`,
      nid: tail10,
    };
  }

  /** Convenience: a unique AGENT. */
  static uniqueAgent(gmailBaseLocal: string, password: string): AgentData {
    return TestDataGenerator.uniqueUser(gmailBaseLocal, password, 'agent', 0);
  }

  /** Convenience: a unique CUSTOMER (offset keeps it distinct from the agent). */
  static uniqueCustomer(gmailBaseLocal: string, password: string): UserData {
    return TestDataGenerator.uniqueUser(gmailBaseLocal, password, 'customer', 1000);
  }
}
