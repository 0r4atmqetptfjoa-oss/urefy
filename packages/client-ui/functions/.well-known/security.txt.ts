export const onRequestGet: PagesFunction = async () => {
  const content = `# UREfy RFC 9116 Security Disclosure Policy
Contact: mailto:contact@urefy.com
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en, ro
Canonical: https://urefy.com/.well-known/security.txt
Policy: https://github.com/0r4atmqetptfjoa-oss/urefy/blob/main/docs/SECURITY_WHITEPAPER.md
Acknowledgments: https://github.com/0r4atmqetptfjoa-oss/urefy/releases
Hiring: https://urefy.com/about
Encryption: https://urefy.com/security
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
