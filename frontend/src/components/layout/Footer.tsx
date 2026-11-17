import { Link } from 'react-router-dom';

/** Соцсети по макету Figma: зелёные круги с иконками. */
const SOCIALS = [
  { name: 'ВКонтакте', icon: '/footer/vk.svg' },
  { name: 'Telegram', icon: '/footer/telegram.svg' },
  { name: 'YouTube', icon: '/footer/youtube.svg' },
  { name: 'Одноклассники', icon: '/footer/odnoklassniki.svg' },
];

/**
 * Футер приложения. Фиксирован внизу страницы через flex-колонку Layout
 * (если контент меньше вьюпорта — футер всё равно прижат к низу).
 */
const Footer = () => {
  return (
    <footer className="footer">
      <img className="footer__blob footer__blob--left" src="/footer/blob-left.svg" alt="" aria-hidden="true" />
      <img className="footer__blob footer__blob--right" src="/footer/blob-right.svg" alt="" aria-hidden="true" />

      <div className="footer__inner container">
        <div className="footer__logo">Библиотеки</div>

        <div className="footer__socials">
          {SOCIALS.map((social) => (
            <a
              key={social.name}
              className="footer__social"
              href="#"
              aria-label={social.name}
              title={social.name}
            >
              <img src={social.icon} alt="" aria-hidden="true" />
            </a>
          ))}
        </div>

        <Link className="footer__policy" to="/">
          Политика конфиденциальности
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
