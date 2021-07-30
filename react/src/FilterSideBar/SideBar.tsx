import { useEffect } from "react";
import classNames from 'classnames';
import { createPortal } from 'react-dom';
import OutSideClickHandler from 'react-outside-click-handler';
import Animation from 'vtex.store-components/Animation'
import searchResult from '../searchResult.css'

interface SidebarProps{
    intl:any;
    isOpen:boolean;
    children:any;
    onOutsideClick:() => void;
    fullWidth:boolean;

}
const OPEN_SIDEBAR_CLASS = 'overflow-hidden'


const SideBar = ({ isOpen, onOutsideClick , fullWidth, children}:SidebarProps) => {

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add(OPEN_SIDEBAR_CLASS)
        }else {
            document.body.classList.remove(OPEN_SIDEBAR_CLASS)
        }

        return () => {
            document.body.classList.remove(OPEN_SIDEBAR_CLASS)
        }

    },[isOpen])

    const scrimClasses = classNames(
        'fixed dim bg-base--inverted top-0 z-9999 w-100 vh-100 o-40 left-0',
        {
          dn: !isOpen,
        }
      )

    const animationClasses = classNames(`${searchResult.sidebar} w-auto-ns h-100 fixed top-0 right-0 z-9999 bg-base shadow-2 flex flex-column`,
    fullWidth ? 'w-100':"w-80"
    )
    

    return createPortal(
        <OutSideClickHandler onOutsideClick={onOutsideClick}>
            <div 
             style = {{willChange:"opacity"}}
             className={scrimClasses}
             onClick={onOutsideClick}>
                <Animation 
                    clasName={animationClasses}
                    isActive={isOpen}
                    type="drawerLeft">
                        {children}
                    
                </Animation>

             </div>

        </OutSideClickHandler>
        ,
        document.body
    )


}

export default SideBar;