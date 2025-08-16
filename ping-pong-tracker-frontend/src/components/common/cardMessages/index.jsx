import React from "react";


const CardMessage = ({text, icon}) => {
    return (
        <div className="pt__card-empty-message">
            <span className="pt__card-icon">{icon}</span>
            <p className="pt__card-message">
                {text}
            </p>
        </div>
    )
}

export default CardMessage;