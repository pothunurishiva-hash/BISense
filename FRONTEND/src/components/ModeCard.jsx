import { Link } from "react-router-dom";

function ModeCard({
	icon,
	label,
	title,
	description,
	link,
	linkText,
	variant = "consumer",
}) {
	return (
		<article className={`mode-card ${variant}`}>
			<div className="mode-icon">{icon}</div>

			<p className="card-label">{label}</p>

			<h3>{title}</h3>

			<p>{description}</p>

			<Link to={link} className="text-btn">
				{linkText} →
			</Link>
		</article>
	);
}

export default ModeCard;
