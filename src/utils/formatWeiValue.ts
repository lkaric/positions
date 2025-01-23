import { type Numbers, utils } from 'web3';

const formatWeiValue = (wei: Numbers): string => {
  return utils.fromWei(wei, 'ether');
};

export { formatWeiValue };
