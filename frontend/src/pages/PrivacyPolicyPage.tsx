import policyText from '../components/common/data.txt?raw';

const PrivacyPolicyPage = () => {
  return (
    <div className="privacy-policy container py-4">
      <h1 className="mb-4">Политика конфиденциальности</h1>
      <pre className="privacy-policy__text">{policyText}</pre>
    </div>
  );
};

export default PrivacyPolicyPage;
